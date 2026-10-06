import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

const root = "D:/Yossi/JNF-Game";
const picDir = join(root, "Pictures");
const outDir = join(root, "public", "pictures");
mkdirSync(outDir, { recursive: true });

function q(id, name, hint, lat, lng, difficulty, category, picture) {
  let image_url = "";
  if (picture) {
    const ext = extname(picture);
    const destName = `${id}${ext}`;
    copyFileSync(join(picDir, picture), join(outDir, destName));
    image_url = `/pictures/${destName}`;
  }
  return { id, name, hint, image_url, latitude: lat, longitude: lng, difficulty, category };
}

const questions = [
  q("ofakim", "Ofakim", "A Negev development town west of Be'er Sheva, in a JNF focus area of the western Negev.", 31.3141, 34.6203, "easy", "settlements"),
  q("sderot", "Sderot", "A western Negev town overlooking the Gaza envelope, long a JNF focus community.", 31.525, 34.5954, "easy", "settlements"),
  q("netivot", "Netivot", "A Negev town between Ofakim and Sderot, in the northwestern Negev.", 31.4232, 34.5891, "easy", "settlements"),
  q("yeruham", "Yeruham", "A small Negev town south of Dimona, beside a desert lake and crater country.", 31.0101, 34.9316, "medium", "settlements"),
  q("mitzpe-ramon", "Mitzpe Ramon", "A cliff-top Negev town on the rim of the Ramon Crater.", 30.6094, 34.8011, "easy", "settlements"),
  q("arad", "Arad", "A desert town on the edge of the Judean Desert, east of Be'er Sheva toward the Dead Sea.", 31.2589, 35.214, "easy", "settlements"),
  q("beer-sheva", "Be'er Sheva", "Capital of the Negev and a major JNF urban focus in Israel's south.", 31.253, 34.7915, "easy", "settlements"),
  q("ramat-negev", "Ramat Negev Regional Council", "A vast rural council in the central Negev, covering farms and desert communities south of Be'er Sheva.", 30.982, 34.707, "medium", "settlements"),
  q("eshkol-council", "Eshkol Regional Council", "A western Negev regional council of kibbutzim and moshavim along the Gaza envelope.", 31.305, 34.485, "medium", "settlements"),
  q("shlomit", "Shlomit", "A young community in the Halutza sands of the western Negev, near the Egyptian border.", 31.1944, 34.3281, "medium", "settlements"),
  q("bnei-netzarim", "Bnei Netzarim", "A Halutza sands community in the western Negev, south of the Gaza envelope.", 31.1442, 34.3314, "medium", "settlements"),
  q("beeri", "Kibbutz Be'eri", "A Gaza-envelope kibbutz in the northwestern Negev, a JNF focus community.", 31.4242, 34.4903, "medium", "settlements"),
  q("shaar-hanegev", "Sha'ar HaNegev Regional Council", "A cluster of kibbutzim and communities north of the Gaza envelope, around Sderot.", 31.482, 34.599, "medium", "settlements"),
  q("kfar-aza", "Kibbutz Kfar Aza", "A Gaza-envelope kibbutz just east of the border, in the Sha'ar HaNegev region.", 31.4836, 34.5336, "medium", "settlements"),
  q("nir-oz", "Kibbutz Nir Oz", "A western Negev kibbutz in the Eshkol region, near the Gaza envelope.", 31.3097, 34.4028, "medium", "settlements"),
  q("reim", "Kibbutz Re'im", "A Gaza-envelope kibbutz in the northwestern Negev, near the Nova festival site.", 31.3858, 34.4597, "medium", "settlements"),
  q("sapir", "Sapir (Central Arava)", "An Arava community that serves as a hub for the central Arava, north of Eilat.", 30.6134, 35.1853, "medium", "settlements"),
  q("eilot-council", "Eilot Regional Council", "The southernmost regional council in Israel, covering Arava communities north of Eilat.", 29.896, 35.064, "medium", "settlements"),
  q("central-arava", "Central Arava Regional Council", "A long strip of Arava farming communities between the Dead Sea and Eilat.", 30.61, 35.18, "medium", "settlements"),
  q("kiryat-shmona", "Kiryat Shmona", "The main town of the Hula Valley, at the foot of the Naftali Mountains in the far north.", 33.2079, 35.5702, "easy", "settlements"),
  q("beit-shean", "Beit She'an", "An ancient and modern town in the Jordan Valley, famous for Roman ruins and a JNF focus area.", 32.4971, 35.496, "easy", "settlements"),
  q("galil-elyon", "Galil Elyon Regional Council", "Upper Galilee kibbutzim and moshavim around the Hula Valley and Naftali hills.", 33.149, 35.627, "medium", "settlements"),
  q("misgav-am", "Kibbutz Misgav Am", "A hilltop kibbutz on the Naftali ridge, overlooking Lebanon in the Upper Galilee.", 33.2476, 35.5483, "medium", "settlements"),

  q("jnfusa-culinary-center", "JNF-USA Culinary Center", "A JNF-USA culinary and community center at Kibbutz Gonen in the Hula Valley.", 33.124, 35.647, "medium", "jnf-sites", "JNFUSA Culinary Center.webp"),
  q("jnfusa-zionist-village", "JNF-USA Zionist Village", "A JNF-USA site in Be'er Sheva River Park, part of the city's green river revitalization.", 31.245, 34.782, "medium", "jnf-sites"),
  q("jnf-arava-campus", "JNF Arava Campus", "A JNF campus at Kibbutz Sapir serving education and community life in the central Arava.", 30.6134, 35.1853, "medium", "jnf-sites"),
  q("jnf-business-complex", "JNF Business Complex", "A JNF business and employment complex in Mitzpe Ramon on the Ramon Crater rim.", 30.6095, 34.8025, "medium", "jnf-sites"),
  q("alexander-muss-campus", "Alexander Muss Campus", "The Alexander Muss High School in Israel campus in Hod HaSharon, a JNF-USA education site.", 32.15, 34.888, "medium", "jnf-sites", "Alexander Muss Campus.jpeg"),
  q("lotem-emek-hashalom", "Lotem Emek HaShalom", "A JNF-linked site in Emek HaShalom by Nahal HaShofet Park, in the Menashe Hills.", 32.596, 35.11, "medium", "jnf-sites", "Lotem Emek HaShalom.webp"),

  q("neot-kedumim", "Neot Kedumim", "A biblical landscape reserve between Tel Aviv and Jerusalem, planting the plants of ancient Israel.", 31.941, 34.977, "hard", "general-sites", "Neot Kdumim.jpg"),
  q("acre", "Old City of Acre (Akko)", "A UNESCO-listed Crusader and Ottoman port city on the northern Mediterranean coast.", 32.9234, 35.0718, "easy", "general-sites"),
  q("kfar-saba", "Kfar Saba", "A central Sharon-plain city just east of Herzliya and Ra'anana.", 32.1782, 34.9076, "easy", "general-sites"),
  q("ariel-sharon-park", "Ariel Sharon Park", "A huge metropolitan park on the former Hiriya landfill, at the eastern edge of Tel Aviv.", 32.031, 34.82, "hard", "general-sites", "Ariel Sharon Park.jpeg"),
  q("anu-museum", "ANU Museum, Tel Aviv", "The Museum of the Jewish People on the Tel Aviv University campus in Ramat Aviv.", 32.1136, 34.8054, "hard", "general-sites", "ANU Museum.jpeg"),
  q("ayalon-institute", "Ayalon Institute, Rehovot", "A secret pre-state underground bullet factory hidden beneath a kibbutz hill in Rehovot.", 31.9105, 34.8068, "medium", "general-sites", "Ayalon Institute.jpeg"),
  q("weizmann-institute", "Weizmann Institute, Rehovot", "Israel's renowned science research institute in Rehovot, named for the first president.", 31.9076, 34.8126, "medium", "general-sites", "Weizmann Institute.jpeg"),
  q("technion", "Technion, Haifa", "Israel's leading technology university, set on the slopes of Mount Carmel in Haifa.", 32.7768, 35.0234, "medium", "general-sites"),
  q("bahai-gardens", "Baha'i Gardens, Haifa", "Terraced gardens cascading down Mount Carmel, a UNESCO site in Haifa.", 32.8116, 34.9866, "easy", "general-sites", "Bahai Gardens.jpeg"),
  q("caesarea", "Caesarea", "A Roman port city on the Mediterranean, with a theater, aqueduct, and Crusader walls.", 32.501, 34.8922, "easy", "general-sites", "Caesarea.jpeg"),
  q("western-wall", "The Western Wall", "Judaism's holiest prayer site, a remnant of the Temple Mount in Jerusalem's Old City.", 31.7767, 35.2345, "easy", "general-sites", "The Western Wall.jpeg"),
  q("elah-valley", "Elah Valley", "The lowland valley where David is said to have faced Goliath, southwest of Jerusalem.", 31.69, 34.952, "medium", "general-sites", "Elah Valley.jpeg"),
  q("yad-vashem", "Yad Vashem", "Israel's Holocaust memorial and museum on the Mount of Remembrance in Jerusalem.", 31.774, 35.176, "easy", "general-sites", "Yad Vashem.jpeg"),
  q("ammunition-hill", "Ammunition Hill", "A Six-Day War battleground and memorial in northern Jerusalem.", 31.798, 35.226, "medium", "general-sites", "Ammunition Hill.jpeg"),
  q("mount-tabor", "Mount Tabor", "A distinct dome-shaped mountain in the Lower Galilee, site of the Transfiguration.", 32.686, 35.39, "hard", "general-sites", "Mount Tabor.jpeg"),
  q("nimrod-fortress", "Nimrod Fortress", "A huge medieval fortress on the southern slopes of Mount Hermon, overlooking the Golan.", 33.252, 35.713, "hard", "general-sites", "Nimrod Fortress.jpeg"),
  q("banias", "Banias Nature Reserve", "Hermon Stream springs, waterfalls, and ancient ruins at the foot of Mount Hermon.", 33.248, 35.695, "hard", "general-sites", "Banias Nature Reserve.jpeg"),
  q("gamla", "Gamla", "A clifftop ancient city and nature reserve on the Golan, known as the Masada of the north.", 32.902, 35.746, "hard", "general-sites", "Gamla.jpeg"),
  q("mount-bental", "Mount Bental", "A lookout volcano on the northern Golan with views into Syria and toward Mount Hermon.", 33.129, 35.786, "hard", "general-sites", "Mount Bental.jpeg"),
  q("mount-hermon", "Mount Hermon", "Israel's highest peak — and its only ski resort in winter.", 33.314, 35.783, "easy", "general-sites", "Mount Hermon.jpeg"),
  q("rosh-hanikra", "Rosh HaNikra", "Chalk sea grottoes on the Lebanese border, reached by cable car along the coast.", 33.093, 35.104, "easy", "general-sites", "Rosh HaNikra.jpeg"),
  q("yehiam-fortress", "Yehi'am Fortress", "A Crusader and later fortress in the Western Galilee, inside a national park by Kibbutz Yehi'am.", 32.993, 35.222, "hard", "general-sites"),
  q("montfort-castle", "Montfort Castle", "A ruined Teutonic Crusader castle hidden in a Western Galilee river gorge.", 33.047, 35.226, "hard", "general-sites", "Montfort Castle.jpeg"),
  q("yardenit", "Yardenit Baptismal Site", "A baptism site on the Jordan River just south of the Sea of Galilee.", 32.711, 35.572, "hard", "general-sites", "Yardenit Baptismal Site.jpeg"),
  q("mount-gilboa", "Mount Gilboa", "A mountain ridge above the Harod and Beit She'an valleys, famous for spring irises.", 32.474, 35.414, "hard", "general-sites", "Mount Gilboa.jpeg"),
  q("tel-megiddo", "Tel Megiddo", "The ancient hill of Armageddon, a UNESCO tel guarding the Jezreel Valley.", 32.585, 35.182, "hard", "general-sites", "Tel Megiddo.jpeg"),
  q("tzippori", "Tzippori / Sepphoris", "A mosaic-rich Galilee archaeological park, once a Roman-era Jewish city near Nazareth.", 32.753, 35.279, "hard", "general-sites", "Tzippori Sepphoris.jpeg"),
  q("mount-arbel", "Mount Arbel", "A cliff above the Sea of Galilee with a fortress cave and a famous hiking overlook.", 32.824, 35.5, "hard", "general-sites", "Mount Arbel.jpeg"),
  q("hula-reserve", "Hula Nature Reserve", "A restored wetland in the Hula Valley, a major bird-migration stop in the north.", 33.073, 35.593, "medium", "general-sites", "Hula Nature Reserve.jpeg"),
  q("rambam-tomb", "Tomb of the Rambam", "The burial place of Maimonides in Tiberias, on the western shore of the Sea of Galilee.", 32.789, 35.537, "hard", "general-sites", "Tomb of the Rambam.jpeg"),
  q("apollonia", "Apollonia (Herzliya)", "Crusader cliff ruins on the Mediterranean shore at the northern edge of Herzliya.", 32.195, 34.807, "hard", "general-sites", "Apollonia.jpeg"),
  q("tel-afek", "Tel Afek (Antipatris Fortress)", "An ancient tel and Ottoman fortress at the Yarkon springs, east of Petah Tikva.", 32.105, 34.93, "hard", "general-sites", "Tel Afek.jpeg"),
  q("beit-shearim", "Beit She'arim National Park", "Catacombs of a Jewish necropolis in the Lower Galilee, a UNESCO World Heritage site.", 32.702, 35.127, "hard", "general-sites", "Beit She'arim National Park.jpeg"),
  q("ramat-hanadiv", "Ramat Hanadiv", "Memorial gardens and a nature park on the southern Carmel, above Zichron Ya'akov.", 32.553, 34.944, "hard", "general-sites", "Ramat Hanadiv.jpeg"),
  q("the-castel", "The Castel", "A hilltop fortress and 1948 battleground on the road up to Jerusalem from the coast.", 31.796, 35.144, "hard", "general-sites", "The Castel.jpeg"),
  q("sorek-cave", "Sorek Stalactite Cave", "A spectacular stalactite cave in the Judean Hills, southwest of Jerusalem.", 31.756, 35.038, "hard", "general-sites", "Sorek Stalactite Cave.jpeg"),
  q("tel-gezer", "Tel Gezer", "A biblical tel in the Shephelah guarding the road from the coast up to Jerusalem.", 31.859, 34.919, "hard", "general-sites", "Tel Gezer.jpeg"),
  q("tel-lachish", "Tel Lachish", "A major biblical fortress tel in the Judean Shephelah, south of Beit Guvrin.", 31.565, 34.849, "hard", "general-sites", "Tel Lachish.jpeg"),
  q("masada", "Masada", "A clifftop desert fortress overlooking the Dead Sea, reached by snake path or cable car.", 31.3156, 35.3539, "easy", "general-sites", "Masada.jpeg"),
  q("ein-gedi", "Ein Gedi Nature Reserve", "Desert waterfalls and ibex country on the western shore of the Dead Sea.", 31.47, 35.388, "hard", "general-sites", "Ein Gedi Nature Reserve.jpeg"),
  q("ein-bokek", "Ein Bokek", "The main hotel strip on the southern Dead Sea, famous for spa beaches.", 31.2, 35.362, "hard", "general-sites", "Ein Bokek.jpeg"),
  q("tel-arad", "Tel Arad", "Canaanite and Israelite ruins on a desert tel east of modern Arad.", 31.281, 35.126, "hard", "general-sites", "Tel Arad.jpeg"),
  q("ben-gurion-tomb", "Ben-Gurion's Tomb", "The graves of David and Paula Ben-Gurion overlooking Zin Canyon at Midreshet Ben-Gurion.", 30.852, 34.783, "medium", "general-sites", "Ben-Gurion's Tomb.jpeg"),
  q("ein-avdat", "Ein Avdat National Park", "A deep desert canyon with a spring and ibex, along the Zin in the Negev Highlands.", 30.827, 34.763, "hard", "general-sites", "Ein Avdat National Park.jpeg"),
  q("timna-park", "Timna Park", "Ancient copper mines, red sandstone, and mushroom rocks north of Eilat.", 29.788, 34.987, "medium", "general-sites", "Timna Park.jpg"),
  q("yad-mordechai", "Yad Mordechai", "A Gaza-envelope kibbutz with a 1948 battlefield museum and a statue of Mordechai Anielewicz.", 31.589, 34.557, "hard", "general-sites", "Yad Mordechai.jpeg"),
  q("reim-nova", "Re'im Nova Memorial Site", "The memorial at the Nova music festival site near Kibbutz Re'im in the western Negev.", 31.397, 34.471, "hard", "general-sites", "Re'im Nova Memorial Site.jpeg"),
  q("shivta", "Shivta National Park", "A ruined Byzantine desert city on the Incense Route in the Negev.", 30.881, 34.629, "hard", "general-sites", "Shivta National Park.jpeg"),
  q("eshkol-park", "Eshkol Park (Ein HaBesor)", "A green oasis and springs in the Besor, in the western Negev Eshkol region.", 31.309, 34.487, "hard", "general-sites", "Eshkol Park.jpeg"),
  q("red-canyon", "The Red Canyon", "A narrow red-sandstone slot canyon in the southern Eilat Mountains.", 29.685, 34.882, "hard", "general-sites", "The Red Canyon.jpeg"),
  q("hai-bar-yotvata", "Hai-Bar Yotvata Nature Reserve", "A desert wildlife reserve in the southern Arava that reintroduces biblical animals.", 29.87, 35.044, "hard", "general-sites", "Hai-Bar Yotvata Nature Reserve.jpeg"),
  q("tel-beer-sheva", "Tel Be'er Sheva", "The ancient tel of biblical Beersheba, a UNESCO site just east of the modern city.", 31.244, 34.84, "medium", "general-sites", "Tel Be'er Sheva.jpeg"),
  q("muhraka", "Muhraka Monastery", "A Carmelite monastery on Mount Carmel marking Elijah's contest with the prophets of Baal.", 32.672, 35.088, "hard", "general-sites", "Muhraka Monastery.jpeg"),
  q("tel-dor", "Tel Dor", "An ancient coastal tel and lagoon south of Haifa, once a major Phoenician and royal port.", 32.617, 34.917, "hard", "general-sites", "Tel Dor.jpeg"),
  q("pool-of-the-arches", "Pool of the Arches, Ramla", "An underground Abbasid cistern with stone arches in the city of Ramla.", 31.929, 34.866, "hard", "general-sites", "Pool of the Arches.jpeg"),
  q("yad-la-shiryon", "Yad La-Shiryon, Latrun", "Israel's armored corps memorial and tank museum at Latrun, on the road to Jerusalem.", 31.839, 34.98, "hard", "general-sites", "Yad La-Shiryon, Latrun.jpeg"),
];

const families = { settlements: 0, "jnf-sites": 0, "general-sites": 0 };
for (const item of questions) families[item.category] += 1;

const payload = {
  version: 4,
  note: "Official JNF / Green Horizons bank. Three families: settlements, jnf-sites, general-sites. Coordinates are WGS84. English only.",
  questions,
};

writeFileSync(join(root, "public", "questions.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log("Wrote", questions.length, "places", families);
console.log("with photos", questions.filter((x) => x.image_url).length);
