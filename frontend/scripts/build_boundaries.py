"""매물 좌표가 속한 필지 테두리를 연속지적도(SHP)에서 뽑아 frontend/public/data/boundaries.json 으로 저장.

사용법 (frontend 폴더에서):
    python -I scripts/build_boundaries.py <매물 CSV> <지적도 폴더> [출력 JSON]
    예) python -I scripts/build_boundaries.py ../매물_50건_수정샘플.csv ../../지적도

- 지적도 폴더: V-World 연속지적도형정보(LSMD_CONT_LDREG) 압축을 구마다 푼 폴더들 (하위 폴더까지 찾음)
- 좌표계 EPSG:5186 (Korea 2000 / Central Belt 2010) → 위도·경도(WGS84와 같다고 봄) 로 변환
- 설치할 패키지 없이 파이썬 기본 기능만 사용
- 매물이 바뀌면 다시 실행
"""
import csv
import json
import math
import os
import struct
import sys

# ---- EPSG:5186 횡메르카토르 (GRS80, 중앙경선 127°, 원점위도 38°, 가산 200000 / 600000 m) ----
A = 6378137.0
F = 1 / 298.257222101
E2 = F * (2 - F)
EP2 = E2 / (1 - E2)
K0 = 1.0
LON0 = math.radians(127.0)
LAT0 = math.radians(38.0)
FE, FN = 200000.0, 600000.0


def _meridian(phi):
    e4, e6 = E2 * E2, E2 ** 3
    return A * ((1 - E2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * phi
                - (3 * E2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * math.sin(2 * phi)
                + (15 * e4 / 256 + 45 * e6 / 1024) * math.sin(4 * phi)
                - (35 * e6 / 3072) * math.sin(6 * phi))


M0 = _meridian(LAT0)


def to_tm(lat, lng):
    """위도·경도(도) → EPSG:5186 (x 동쪽, y 북쪽, m)"""
    phi, lam = math.radians(lat), math.radians(lng)
    n = A / math.sqrt(1 - E2 * math.sin(phi) ** 2)
    t = math.tan(phi) ** 2
    c = EP2 * math.cos(phi) ** 2
    a = (lam - LON0) * math.cos(phi)
    x = FE + K0 * n * (a + (1 - t + c) * a ** 3 / 6 + (5 - 18 * t + t * t + 72 * c - 58 * EP2) * a ** 5 / 120)
    y = FN + K0 * (_meridian(phi) - M0 + n * math.tan(phi) * (
        a * a / 2 + (5 - t + 9 * c + 4 * c * c) * a ** 4 / 24 + (61 - 58 * t + t * t + 600 * c - 330 * EP2) * a ** 6 / 720))
    return x, y


def to_latlng(x, y):
    """EPSG:5186 → 위도·경도(도)"""
    m = M0 + (y - FN) / K0
    mu = m / (A * (1 - E2 / 4 - 3 * E2 ** 2 / 64 - 5 * E2 ** 3 / 256))
    e1 = (1 - math.sqrt(1 - E2)) / (1 + math.sqrt(1 - E2))
    phi1 = (mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * math.sin(2 * mu)
            + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * math.sin(4 * mu)
            + (151 * e1 ** 3 / 96) * math.sin(6 * mu)
            + (1097 * e1 ** 4 / 512) * math.sin(8 * mu))
    c1 = EP2 * math.cos(phi1) ** 2
    t1 = math.tan(phi1) ** 2
    n1 = A / math.sqrt(1 - E2 * math.sin(phi1) ** 2)
    r1 = A * (1 - E2) / (1 - E2 * math.sin(phi1) ** 2) ** 1.5
    d = (x - FE) / (n1 * K0)
    phi = phi1 - (n1 * math.tan(phi1) / r1) * (
        d * d / 2 - (5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * EP2) * d ** 4 / 24
        + (61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * EP2 - 3 * c1 * c1) * d ** 6 / 720)
    lam = LON0 + (d - (1 + 2 * t1 + c1) * d ** 3 / 6
                  + (5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * EP2 + 24 * t1 * t1) * d ** 5 / 120) / math.cos(phi1)
    return math.degrees(phi), math.degrees(lam)


# ---- SHP (Polygon) · DBF 읽기 ----
def read_polygons(shp_path):
    """(레코드 번호, bbox, rings) 를 차례로. rings = [[(x, y), ...], ...]"""
    with open(shp_path, 'rb') as f:
        data = f.read()
    pos, index = 100, 0
    while pos + 8 <= len(data):
        length = struct.unpack('>i', data[pos + 4:pos + 8])[0] * 2
        body = pos + 8
        shape_type = struct.unpack('<i', data[body:body + 4])[0]
        if shape_type == 5:
            bbox = struct.unpack('<4d', data[body + 4:body + 36])
            yield index, bbox, (data, body)
        pos = body + length
        index += 1


def rings_of(ref):
    data, body = ref
    num_parts, num_points = struct.unpack('<2i', data[body + 36:body + 44])
    parts = list(struct.unpack(f'<{num_parts}i', data[body + 44:body + 44 + 4 * num_parts]))
    pts_at = body + 44 + 4 * num_parts
    flat = struct.unpack(f'<{2 * num_points}d', data[pts_at:pts_at + 16 * num_points])
    points = list(zip(flat[0::2], flat[1::2]))
    bounds = parts + [num_points]
    return [points[bounds[i]:bounds[i + 1]] for i in range(num_parts)]


class Dbf:
    def __init__(self, path, encoding):
        self.f = open(path, 'rb')
        head = self.f.read(32)
        self.count, self.header_len, self.rec_len = struct.unpack('<I2H', head[4:12])
        self.fields = []
        offset = 1  # 맨 앞 1바이트 = 삭제 표시
        while True:
            desc = self.f.read(32)
            if desc[0] == 0x0D:
                break
            name = desc[:11].split(b'\0')[0].decode('ascii')
            size = desc[16]
            self.fields.append((name, offset, size))
            offset += size
        self.encoding = encoding

    def record(self, i):
        self.f.seek(self.header_len + i * self.rec_len)
        raw = self.f.read(self.rec_len)
        return {n: raw[o:o + s].decode(self.encoding, 'replace').strip() for n, o, s in self.fields}


def inside(pt, ring):
    x, y = pt
    hit = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            hit = not hit
        j = i
    return hit


def find_shapefiles(root):
    """{"성남시 분당구": ".../LSMD_CONT_LDREG_41135_202611.shp"} — 폴더 이름의 "경기_성남시_분당구" 로 구 이름을 정함"""
    found = {}
    for dirpath, _, files in os.walk(root):
        for name in files:
            if name.lower().endswith('.shp'):
                label = os.path.basename(dirpath)
                parts = label.split('_')
                gu = ' '.join(p for p in parts if p.endswith(('시', '구', '군')))
                found[gu] = os.path.join(dirpath, name)
    return found


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    csv_path, cad_root = sys.argv[1], sys.argv[2]
    out_path = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'boundaries.json')
    sys.stdout.reconfigure(encoding='utf-8')

    # 좌표 변환 확인: 원점 (127°, 38°) → (200000, 600000), 왕복 오차
    ox, oy = to_tm(38.0, 127.0)
    assert abs(ox - FE) < 1e-6 and abs(oy - FN) < 1e-6, (ox, oy)
    lat, lng = to_latlng(*to_tm(37.38, 127.12))
    assert abs(lat - 37.38) < 1e-8 and abs(lng - 127.12) < 1e-8, (lat, lng)

    listings = {}
    for r in csv.DictReader(open(csv_path, encoding='utf-8-sig')):
        gu = ' '.join(r['시군구'].split()[1:3])
        listings.setdefault(gu, []).append((int(r['no']), r['단지명'], to_tm(float(r['위도']), float(r['경도']))))

    shapefiles = find_shapefiles(cad_root)
    result, missing = {}, []
    for gu, items in listings.items():
        shp = shapefiles.get(gu)
        if not shp:
            missing += [(no, name, f'{gu} 지적도 파일 없음') for no, name, _ in items]
            continue
        cpg = shp[:-4] + '.cpg'
        encoding = open(cpg, encoding='ascii').read().strip() if os.path.exists(cpg) else 'cp949'
        encoding = 'cp949' if encoding.upper() in ('EUC-KR', 'EUCKR') else encoding
        dbf = Dbf(shp[:-4] + '.dbf', encoding)
        todo = {no: (name, pt) for no, name, pt in items}
        for index, (x0, y0, x1, y1), ref in read_polygons(shp):
            hits = [no for no, (_, (x, y)) in todo.items() if x0 <= x <= x1 and y0 <= y <= y1]
            if not hits:
                continue
            rings = rings_of(ref)
            for no in hits:
                pt = todo[no][1]
                containing = [ring for ring in rings if inside(pt, ring)]
                if len(containing) % 2 == 0:  # 구멍(hole) 안이면 짝수
                    continue
                ring = max(containing, key=len)
                attrs = dbf.record(index)
                result[str(no)] = {
                    'type': 'Polygon',
                    'coordinates': [[[round(lng, 6), round(lat, 6)] for lat, lng in (to_latlng(x, y) for x, y in ring)]],
                    'pnu': attrs.get('PNU'),
                    'jibun': attrs.get('JIBUN'),
                }
                del todo[no]
            if not todo:
                break
        missing += [(no, name, f'{gu} 필지 안에 없음 (좌표가 필지 밖)') for no, (name, _) in todo.items()]
        print(f'{gu}: {len(items) - len(todo)}/{len(items)}건')

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(result, f, ensure_ascii=False, separators=(',', ':'))
    print(f'저장: {os.path.abspath(out_path)} ({len(result)}건, {os.path.getsize(out_path) / 1024:.1f} KB)')
    for no, name, why in missing:
        print(f'  ✗ {no} {name}: {why}')


if __name__ == '__main__':
    main()
