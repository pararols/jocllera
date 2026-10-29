import json

with open('src/data/gis_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

bads = data['environmentalBads']
bads[0]['type'] = 'piscines_clim'
bads[1]['type'] = 'estufes_terrasses'
bads[2]['type'] = 'camp_golf'
bads[3]['type'] = 'bomba_calor'
bads[4]['type'] = 'estufes_terrasses'
bads[5]['type'] = 'camp_golf'
bads[6]['type'] = 'bomba_calor'
bads[7]['type'] = 'bomba_calor'
bads[8]['type'] = 'piscines_clim'

rooftops = [inst for inst in data['installations'] if inst['type'] == 'rooftop']
types = ['connect', 'slider', 'rhythm', 'quiz', 'balance']

for i, inst in enumerate(rooftops):
    inst['minigame'] = types[i % len(types)]

with open('src/data/gis_data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
