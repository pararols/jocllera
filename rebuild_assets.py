import base64
import os

def get_base64(path):
    with open(path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        ext = os.path.splitext(path)[1][1:] # get extension without dot
        if ext == 'jpg': ext = 'jpeg'
        return f"data:image/{ext};base64,{encoded_string}"

def rebuild_assets():
    brain_dir = r"C:\Users\parar\.gemini\antigravity\brain\b879ff54-16b2-4010-a198-7920a6c92bae"
    assets = {
        "aquifer": {
            "farm": os.path.join(brain_dir, "aquifer_background_farm_1771755683104.png"),
            "golf": os.path.join(brain_dir, "aquifer_background_golf_1771755658839.png"),
            "river": os.path.join(brain_dir, "ter_river_forest_aquifer_1771849519044.png"),
            "sky": os.path.join(brain_dir, "cartoon_sky_clouds_game_1771849547317.png")
        },
        "evaporation": {
            "pool": os.path.join(brain_dir, "evaporation_pool_bg_1771855183122.png"),
            "blanket": os.path.join(brain_dir, "thermal_blanket_texture_1771855246413.png")
        },
        "heatHaze": {
            "bar": os.path.join(brain_dir, "bar_entrance_terrace_night_1771865083318.png"),
            "stove": os.path.join(brain_dir, "patio_gas_heater_stove_1771865212426.png")
        }
    }

    output = "export const minigameAssets = {\n"
    for game_key, game_assets in assets.items():
        output += f"  {game_key}: {{\n"
        for key, path in game_assets.items():
            if os.path.exists(path):
                b64 = get_base64(path)
                output += f'    {key}: "{b64}",\n'
            else:
                print(f"Warning: {path} not found")
        output = output.rstrip(",\n") + "\n  },\n"
    
    output = output.rstrip(",\n") + "\n};\n"

    with open("src/data/minigame_assets.js", "w", encoding="utf-8") as f:
        f.write(output)
    print("Successfully rebuilt src/data/minigame_assets.js")

if __name__ == "__main__":
    rebuild_assets()
