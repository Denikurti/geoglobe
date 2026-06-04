// ── Ancient region mapping (country numeric ID → ancient region) ──────────
// IDs match TopoJSON world-atlas country numeric codes
const ANCIENT_MAP = {
  // Mesopotamia / Fertile Crescent
  368: { name: "Mesopotamia", cls: "anc-mesopotamia" },   // Iraq
  760: { name: "Ancient Syria / Aram", cls: "anc-levant" }, // Syria

  // Persia / Achaemenid
  364: { name: "Persia", cls: "anc-persia" },              // Iran

  // Holy Land / Levant
  376: { name: "Judea / Holy Land", cls: "anc-judea" },    // Israel
  275: { name: "Judea / Holy Land", cls: "anc-judea" },    // Palestine
  400: { name: "Nabataea", cls: "anc-levant" },            // Jordan
  422: { name: "Phoenicia", cls: "anc-levant" },           // Lebanon

  // Egypt
  818: { name: "Kemet (Egypt)", cls: "anc-egypt" },        // Egypt

  // Arabia
  682: { name: "Arabia Felix", cls: "anc-arabia" },        // Saudi Arabia
  887: { name: "Arabia Felix", cls: "anc-arabia" },        // Yemen
  784: { name: "Arabia", cls: "anc-arabia" },              // UAE
  634: { name: "Arabia", cls: "anc-arabia" },              // Qatar

  // Roman / Byzantine
  380: { name: "Roman Heartland", cls: "anc-rome" },       // Italy
  300: { name: "Ancient Greece", cls: "anc-greece" },      // Greece
  792: { name: "Anatolia / Byzantium", cls: "anc-byzantine" }, // Turkey
  250: { name: "Gaul", cls: "anc-rome" },                  // France
  724: { name: "Hispania", cls: "anc-rome" },              // Spain
  826: { name: "Britannia", cls: "anc-germanic" },         // UK
  56:  { name: "Belgica", cls: "anc-rome" },               // Belgium
  528: { name: "Low Countries", cls: "anc-germanic" },     // Netherlands
  620: { name: "Lusitania", cls: "anc-rome" },             // Portugal
  40:  { name: "Pannonia", cls: "anc-rome" },              // Austria
  642: { name: "Dacia", cls: "anc-germanic" },             // Romania
  756: { name: "Helvetia", cls: "anc-germanic" },          // Switzerland

  // Germanic / Norse
  276: { name: "Germania", cls: "anc-germanic" },          // Germany
  752: { name: "Norse Lands", cls: "anc-norse" },          // Sweden
  578: { name: "Norse Lands", cls: "anc-norse" },          // Norway

  // Slavic / Rus
  643: { name: "Scythia / Rus", cls: "anc-rus" },          // Russia
  804: { name: "Kievan Rus", cls: "anc-rus" },             // Ukraine
  616: { name: "Sarmatia", cls: "anc-rus" },               // Poland

  // Americas (outside ancient world)
  840: { name: "Unknown World", cls: "anc-unknown" },
  124: { name: "Unknown World", cls: "anc-unknown" },
  484: { name: "Mesoamerica", cls: "anc-unknown" },
};

// ── Key ancient cities ────────────────────────────────────────────────────
const ANCIENT_CITIES = [
  { name: "Jerusalem", lon: 35.22, lat: 31.78, type: "holy",
    summary: "The holiest city on earth — sacred to Judaism, Christianity, and Islam simultaneously.",
    detail: "Judaism: Temple Mount, Wailing Wall. Christianity: crucifixion, resurrection of Jesus. Islam: Muhammad's Night Journey (Al-Isra). Rome destroyed the Second Temple 70 AD, scattering Jews globally (Diaspora). Control of Jerusalem has caused wars for 3,000 years and still defines the Israel-Palestine conflict today." },

  { name: "Rome", lon: 12.49, lat: 41.90, type: "church",
    summary: "Capital of the Roman Empire → headquarters of the Catholic Church.",
    detail: "Peter, the first Pope, was martyred in Rome ~64 AD. The Church absorbed the Roman Empire's entire administrative structure — the Pope took the title 'Pontifex Maximus' (chief Roman pagan priest). For 1,000 years, Rome crowned kings and excommunicated emperors. The Vatican today is the world's smallest state with diplomatic relations in 183 countries." },

  { name: "Constantinople", lon: 28.98, lat: 41.01, type: "byzantine",
    summary: "New Rome — capital of the Byzantine (Eastern Roman) Empire for 1,100 years.",
    detail: "Founded by Emperor Constantine 330 AD — the first Christian Roman Emperor. The city defined Eastern Orthodox Christianity. Fell to Ottoman Sultan Mehmed II in 1453 — Islam taking the seat of Christendom shocked Europe and directly triggered the Age of Exploration (find a new route to Asia that bypasses Muslim lands). Now Istanbul." },

  { name: "Mecca", lon: 39.83, lat: 21.42, type: "islam",
    summary: "Birthplace of Muhammad and the holiest city in Islam.",
    detail: "Muhammad born 570 AD. At 40, first revelation in the Cave of Hira. Mecca was already a major trading hub and pagan religious center — the Kaaba pre-existed Islam. Today 2 million Muslims make the Hajj pilgrimage annually. Only Muslims are allowed to enter. Saudi Arabia's control of Mecca gives it massive soft power over the entire Muslim world." },

  { name: "Medina", lon: 39.61, lat: 24.47, type: "islam",
    summary: "City of the Prophet — Muhammad's base and the second holiest city in Islam.",
    detail: "Muhammad fled here from Mecca in 622 AD (the Hijra — Year 1 of the Islamic calendar). He built the first mosque, formed the first Islamic community, and established the political structure of Islam here. After his death in 632 AD, the dispute over his successor in Medina created the Sunni/Shia split that still drives Middle East wars today." },

  { name: "Athens", lon: 23.73, lat: 37.98, type: "philosophy",
    summary: "Birthplace of Western philosophy, democracy, and rational thought.",
    detail: "Socrates, Plato, Aristotle all taught here 5th–4th century BC. Plato's Academy ran for 900 years. The ideas of democracy, logic, ethics, and cosmology developed here became the intellectual foundation for Christianity, Islam (Golden Age), the Renaissance, Enlightenment, and Western liberalism. The New Testament was written in Greek — Athens made that possible." },

  { name: "Alexandria", lon: 29.92, lat: 31.20, type: "philosophy",
    summary: "Greatest library and learning center of the ancient world. Cradle of early Christianity.",
    detail: "Founded by Alexander the Great 331 BC. The Great Library held 500,000+ scrolls — the accumulated knowledge of the ancient world. Early Christian theology (Origen, Athanasius) was developed here. The Septuagint (Greek translation of the Hebrew Bible) was written here — this is the Bible the early Church used. Library burned multiple times — whose fault is still debated." },

  { name: "Babylon", lon: 44.42, lat: 32.54, type: "ancient",
    summary: "Greatest city of the ancient world. Seat of empires, laws, and the first recorded religion.",
    detail: "Capital of Babylonian Empire under Nebuchadnezzar II (~600 BC). Here: the Code of Hammurabi (first written law), the Hanging Gardens, and the Babylonian Captivity of the Jews (586 BC) — when Jewish scribes compiled the Torah. The Babylonian creation myth (Enuma Elish) and flood story (Epic of Gilgamesh) predate and mirror the Genesis stories by 1,000 years." },

  { name: "Ur", lon: 46.10, lat: 30.96, type: "ancient",
    summary: "Birthplace of Abraham — father of Judaism, Christianity, and Islam.",
    detail: "Ancient Sumerian city (~3000 BC), southern Iraq today. According to the Bible, Abraham was born here before God commanded him to journey to Canaan (Israel/Palestine). This makes Ur the ancestral origin point of all three Abrahamic religions — Judaism, Christianity, and Islam — which together have 4 billion followers today." },

  { name: "Persepolis", lon: 52.89, lat: 29.94, type: "ancient",
    summary: "Capital of the Persian Achaemenid Empire — the largest empire the world had seen.",
    detail: "Built by Darius I (~500 BC). The Achaemenid Empire stretched from Greece to India. Persia's official religion was Zoroastrianism — the first monotheistic state religion, which directly influenced Judaism during the Babylonian exile and through that, Christianity and Islam. Cyrus the Great freed the Jews from Babylon (538 BC) — he is the only non-Jewish person called 'Messiah' in the Bible." },

  { name: "Nicaea", lon: 29.72, lat: 40.43, type: "church",
    summary: "Where the Bible was officially decided — First Council of Nicaea, 325 AD.",
    detail: "Emperor Constantine convened 300+ bishops here to settle Christian doctrine. They decided: Jesus is divine (not just a great prophet), established the Nicene Creed (still recited today), standardized Easter's date, and began the process of deciding which texts would form the New Testament Bible. Critics note Constantine — a politician, not a theologian — made these calls for political unity." },

  { name: "Antioch", lon: 36.16, lat: 36.20, type: "church",
    summary: "Where followers of Jesus were first called 'Christians' — the first major Christian city.",
    detail: "Paul of Tarsus used Antioch as his base for spreading Christianity across the Roman Empire. The word 'Christian' was coined here (Acts 11:26). One of the five original patriarchates of Christianity (Rome, Constantinople, Alexandria, Antioch, Jerusalem). Now Antakya, Turkey, near the Syria border." },

  { name: "Nineveh", lon: 43.16, lat: 36.36, type: "ancient",
    summary: "Capital of the Assyrian Empire — the first superpower to use mass deportation as policy.",
    detail: "Assyrian Empire (900–612 BC) conquered Israel and deported the 'Ten Lost Tribes of Israel' — this is why only two tribes (Judah and Benjamin) remained as Jews. The others scattered across Mesopotamia and Persia, their fate a mystery. Nineveh is mentioned in the Bible's Book of Jonah. ISIS bulldozed its ruins in 2015." },

  { name: "Memphis", lon: 31.25, lat: 29.85, type: "ancient",
    summary: "Ancient capital of Egypt — birthplace of one of history's earliest complex religions.",
    detail: "Capital of unified Egypt from ~3100 BC. Egyptian religion — Osiris resurrection, Ra the sun god, afterlife judgment — preceded Christianity by 3,000 years with startling parallels: a dying and rising god, virgin birth mythology, 12 followers, judgment of the soul. Scholars debate direct influence vs. independent origin. The Egyptian mystery schools influenced Greek philosophy (Pythagoras studied in Egypt)." },

  { name: "Carthage", lon: 10.32, lat: 36.85, type: "ancient",
    summary: "Rome's greatest rival — and the city whose destruction shaped Western civilization.",
    detail: "Phoenician colony, now Tunis, Tunisia. Carthage challenged Roman dominance in the Punic Wars (264–146 BC). Rome destroyed Carthage completely in 146 BC — the same year it destroyed Corinth (Greece), giving Rome total Mediterranean dominance. This Roman monopoly on power created the political structure the Catholic Church later inherited. Also: Hannibal crossed the Alps with war elephants to attack Rome." },
];

// Religion & Ancient Geopolitics data
const RELIGION_DATA = {

  // ── Country → religion profile ───────────────────────────────────────────
  countries: {
    USA:            { dominant: "Protestant", secondary: ["Catholic","Jewish diaspora"], color: "rel-protestant" },
    Canada:         { dominant: "Catholic/Protestant", secondary: [], color: "rel-protestant" },
    Mexico:         { dominant: "Catholic", secondary: [], color: "rel-catholic" },
    UK:             { dominant: "Anglican (Protestant)", secondary: ["Catholic"], color: "rel-protestant" },
    Germany:        { dominant: "Protestant/Catholic split", secondary: [], color: "rel-protestant" },
    France:         { dominant: "Catholic (secular state)", secondary: [], color: "rel-catholic" },
    Russia:         { dominant: "Orthodox Christian", secondary: [], color: "rel-orthodox" },
    Italy:          { dominant: "Catholic (Vatican HQ)", secondary: [], color: "rel-catholic" },
    Spain:          { dominant: "Catholic", secondary: [], color: "rel-catholic" },
    Ukraine:        { dominant: "Orthodox Christian", secondary: [], color: "rel-orthodox" },
    Poland:         { dominant: "Catholic", secondary: [], color: "rel-catholic" },
    Netherlands:    { dominant: "Protestant/Secular", secondary: [], color: "rel-protestant" },
    Switzerland:    { dominant: "Protestant/Catholic", secondary: [], color: "rel-protestant" },
    Sweden:         { dominant: "Lutheran (Protestant)", secondary: [], color: "rel-protestant" },
    Turkey:         { dominant: "Sunni Islam", secondary: ["Secular state (Atatürk)"], color: "rel-sunni" },
    Norway:         { dominant: "Lutheran (Protestant)", secondary: [], color: "rel-protestant" },
    Belgium:        { dominant: "Catholic", secondary: [], color: "rel-catholic" },
    Portugal:       { dominant: "Catholic", secondary: [], color: "rel-catholic" },
    Austria:        { dominant: "Catholic", secondary: [], color: "rel-catholic" },
    Greece:         { dominant: "Orthodox Christian", secondary: [], color: "rel-orthodox" },
    Romania:        { dominant: "Orthodox Christian", secondary: [], color: "rel-orthodox" },
    Israel:         { dominant: "Judaism", secondary: ["Islam (Arab citizens)"], color: "rel-jewish" },
    Palestine:      { dominant: "Sunni Islam", secondary: ["Christianity (Bethlehem)"], color: "rel-sunni" },
    "Saudi Arabia": { dominant: "Sunni Islam (Wahhabi)", secondary: [], color: "rel-sunni" },
    Iran:           { dominant: "Shia Islam", secondary: [], color: "rel-shia" },
    Iraq:           { dominant: "Shia majority / Sunni minority", secondary: [], color: "rel-shia" },
    Jordan:         { dominant: "Sunni Islam", secondary: ["Christianity (Jordanian Christians)"], color: "rel-sunni" },
    Lebanon:        { dominant: "Mixed: Shia / Sunni / Maronite Christian", secondary: [], color: "rel-mixed" },
    Syria:          { dominant: "Sunni Islam (Alawite ruling class)", secondary: [], color: "rel-mixed" },
    Egypt:          { dominant: "Sunni Islam", secondary: ["Coptic Christianity (~10%)"], color: "rel-sunni" },
    UAE:            { dominant: "Sunni Islam", secondary: [], color: "rel-sunni" },
    Qatar:          { dominant: "Sunni Islam (Wahhabi)", secondary: [], color: "rel-sunni" },
    Yemen:          { dominant: "Sunni / Shia (Zaydi Houthis)", secondary: [], color: "rel-mixed" },
  },

  // ── Major religion deep profiles ──────────────────────────────────────────
  religions: {
    Christianity: {
      summary: "Born ~30 AD in Roman-occupied Judea. Jesus of Nazareth's teachings spread via the Roman Empire, eventually becoming its official religion (380 AD). Split into Catholic, Orthodox (1054), and Protestant (1517 Reformation) branches.",
      geopolitical_impact: "The Catholic Church ran European politics for 1,000 years — crowned kings, launched Crusades, controlled land. The Pope's blessing or excommunication could topple monarchies. Today the Vatican is the world's smallest state but retains vast soft power.",
      branches: [
        { name: "Catholic", detail: "Led by the Pope in Vatican City. ~1.3B followers. Controls vast real estate, banks (IOR), and diplomatic relations with 183 countries. Historically backed monarchies and colonialism.", status: "CONFIRMED" },
        { name: "Orthodox", detail: "Split from Catholicism in 1054 (Great Schism). Russia's Orthodox Church closely aligned with the Kremlin — used today as justification for Russian nationalism and the Ukraine war framing.", status: "CONFIRMED" },
        { name: "Protestant", detail: "Martin Luther's 1517 Reformation broke Church monopoly. Gave rise to capitalism theory (Weber: Protestant work ethic), the British Empire, and American founding ideology.", status: "CONFIRMED" },
        { name: "Anglican", detail: "Henry VIII broke from Rome in 1534 — not for theology, but to divorce. The British monarch is still the head of the Church of England. Empire and Church were inseparable.", status: "CONFIRMED" },
      ],
      theories: [
        { topic: "Vatican Bank & Finance Control", detail: "The IOR (Vatican Bank) has been linked to money laundering, Mafia, and Cold War CIA funding. Bishop Paul Marcinkus ran it during the P2 Masonic Lodge scandal (1980s).", status: "PARTIALLY CONFIRMED" },
        { topic: "Church shaped all Western law", detail: "Canon law preceded and shaped common law. Marriage, inheritance, property rights — all run through Church courts for 800 years before secular states took over.", status: "CONFIRMED" },
        { topic: "Greek mythology → Catholicism", detail: "Many Catholic saints replaced Roman/Greek gods in the same locations. Zeus → God the Father, Hermes → archangels, mystery schools → monastic orders. Scholars call this 'continuity of cult'.", status: "PARTIALLY CONFIRMED" },
        { topic: "Crusades as geopolitical resource war", detail: "The Crusades (1095–1291) were framed as holy wars but also secured trade routes to Asia (silk, spices) and looted Byzantine wealth. The Church got land; merchants got markets.", status: "CONFIRMED" },
      ],
    },

    Islam: {
      summary: "Founded 610 AD in Mecca (Arabia) by the Prophet Muhammad. After his death in 632 AD, a dispute over succession split the faith into Sunni (majority, backed Abu Bakr as caliph) and Shia (backed Ali, Muhammad's cousin/son-in-law). This split still drives Middle East wars today.",
      geopolitical_impact: "Islam built the largest land empire in history (Umayyad Caliphate). Preserved Greek knowledge during Europe's Dark Ages. The Ottoman Empire controlled the Middle East 600 years until 1922. The Sunni/Shia divide is the fault line of every major Middle East conflict today.",
      branches: [
        { name: "Sunni (85%)", detail: "Follow the Caliphs after Muhammad. Led today by Saudi Arabia (Wahhabi branch — ultra-conservative, funded worldwide since 1970s via oil money). Dominant in Egypt, Turkey, Jordan, Pakistan.", status: "CONFIRMED" },
        { name: "Shia (15%)", detail: "Follow Ali's bloodline. Dominant in Iran (Islamic Republic since 1979), Iraq, Lebanon (Hezbollah), Yemen (Houthis). Iran is the geopolitical leader of the Shia axis.", status: "CONFIRMED" },
        { name: "Alawite", detail: "Offshoot of Shia Islam. Assad family in Syria is Alawite (~12% of population) ruling a Sunni majority — a core driver of the Syrian civil war.", status: "CONFIRMED" },
        { name: "Wahhabi/Salafi", detail: "Ultra-conservative Sunni movement born in 18th-century Arabia. Saudi Arabia exports it globally via mosque funding. Critics link it to radicalization pipeline.", status: "PARTIALLY CONFIRMED" },
      ],
      theories: [
        { topic: "Saudi Arabia funds global Wahhabism", detail: "Since the 1970s oil boom, Saudi Arabia spent ~$200B exporting Wahhabi Islam — funding mosques, madrasas, and textbooks worldwide. Western governments tolerated it in exchange for petrodollar recycling.", status: "CONFIRMED" },
        { topic: "Iran–Saudi proxy war", detail: "Every major Middle East conflict (Yemen, Syria, Lebanon, Iraq) has a Sunni (Saudi) vs Shia (Iran) proxy dimension underneath it. This is the 'cold war' of the Muslim world.", status: "CONFIRMED" },
        { topic: "ISIS as geopolitical tool", detail: "ISIS (Daesh) emerged from the power vacuum of the 2003 Iraq War. Some analysts argue the Sunni insurgency was fuelled by Gulf state money, while others link it to Assad's strategy of releasing jihadists from prison to delegitimise the opposition.", status: "PARTIALLY CONFIRMED" },
        { topic: "Ottoman collapse created today's map", detail: "The Sykes-Picot Agreement (1916) — Britain and France secretly divided the Ottoman Empire into arbitrary nations. Iraq, Syria, Lebanon, Jordan, Palestine were drawn with a ruler, ignoring tribal and religious lines. This is the root of almost every Middle East conflict.", status: "CONFIRMED" },
      ],
    },

    Judaism: {
      summary: "One of the oldest monotheistic religions (~1300 BC). The Torah forms the legal and moral basis for both Christianity and Islam. After the Roman destruction of Jerusalem (70 AD), Jews dispersed globally (Diaspora). The Zionist movement (1890s) sought to return to ancestral land, culminating in the founding of Israel in 1948.",
      geopolitical_impact: "The Holocaust (1939–45) generated global sympathy enabling Israel's creation. The Balfour Declaration (1917) — Britain promised a Jewish homeland in Palestine without consulting Palestinians — still defines the conflict today. Jewish diaspora networks (financial, media, political) give Israel outsized influence in Western capitals.",
      branches: [
        { name: "Orthodox Judaism", detail: "Strict observance of Torah law (Halakha). Influential in Israeli politics — Orthodox parties often hold the balance of power in coalition governments.", status: "CONFIRMED" },
        { name: "Reform/Conservative", detail: "More liberal branches dominant in USA. American Jewish community (~6M) is the most politically active diaspora in the world.", status: "CONFIRMED" },
        { name: "Zionism", detail: "Political movement to establish a Jewish state. Theodor Herzl founded it 1897. Led to the 1948 founding of Israel — which Palestinians call the Nakba (catastrophe).", status: "CONFIRMED" },
        { name: "Kabbalah", detail: "Jewish mysticism with ancient roots. Influenced Renaissance occultism, Freemasonry ritual structures, and New Age spirituality. Madonna's 2003 adoption brought it to pop culture.", status: "PARTIALLY CONFIRMED" },
      ],
      theories: [
        { topic: "Rothschild / banking dynasties", detail: "The Rothschild family, Jewish bankers from Frankfurt, financed European wars on both sides from the Napoleonic era onward. By 1900 they had banking houses in 5 countries. Critics call them the model for 'globalist banking' conspiracy theories — most of which shade into antisemitism.", status: "PARTIALLY CONFIRMED" },
        { topic: "Balfour Declaration and British strategy", detail: "Some historians argue Britain backed Zionism to control the Suez Canal route to India, not out of sympathy. Lord Balfour privately noted that establishing a Jewish homeland would mean 'disregarding the wishes of the existing population'.", status: "PARTIALLY CONFIRMED" },
        { topic: "Israel as US aircraft carrier in Middle East", detail: "US gives Israel ~$3.8B/year in military aid. Strategically, Israel serves as a US power projection point in the Middle East — bases, intelligence sharing, field-tested weapons tech bought by US defence industry.", status: "CONFIRMED" },
      ],
    },

    GreekRoman: {
      summary: "Greek and Roman polytheism (800 BC – 400 AD) shaped Western philosophy, law, democracy, and architecture. When Rome adopted Christianity (380 AD), the Church absorbed the Roman administrative structure, Latin language, and many cult practices. Greek philosophy (Plato, Aristotle) was preserved by Islamic scholars during Europe's Dark Ages and returned to Europe via the Crusades.",
      geopolitical_impact: "The Roman Empire's legal system (Roman Law) is the foundation of all European legal systems today. The Senate structure influenced the US Congress. Greek democracy concepts — distorted through Enlightenment — became the justification for Western liberal order.",
      branches: [
        { name: "Greek Philosophy", detail: "Plato's Republic described an elite philosopher-king class ruling the ignorant masses. Aristotle tutored Alexander the Great. Their ideas fed into Enlightenment, Freemasonry, and Western élite education (Oxford, Harvard).", status: "CONFIRMED" },
        { name: "Roman Law", detail: "Corpus Juris Civilis (529 AD, Justinian) — the most influential legal text ever. Foundation of French, Spanish, Italian, German, and EU law today.", status: "CONFIRMED" },
        { name: "Mystery Schools", detail: "Secret religious orders in Greece and Egypt (Eleusinian, Mithraic mysteries). Initiates learned hidden cosmology. Some scholars trace their symbols and rituals into Freemasonry, Rosicrucianism, and Catholic liturgy.", status: "PARTIALLY CONFIRMED" },
        { name: "Roman Church structure", detail: "The Pope holds the title 'Pontifex Maximus' — originally the chief Roman pagan priest. The Catholic hierarchy (bishop, diocese, cardinal) maps exactly onto Roman imperial administration.", status: "CONFIRMED" },
      ],
      theories: [
        { topic: "Catholic Church absorbed pagan Rome", detail: "Christmas on Dec 25 was originally Saturnalia/Sol Invictus (sun god birthday). Easter timing follows the Pagan spring equinox. Saints replaced local deities in temples. The Vatican sits on the hill where Romans worshipped Cybele.", status: "PARTIALLY CONFIRMED" },
        { topic: "Freemasonry as continuation of mystery schools", detail: "Freemasonry (1717, London) uses Egyptian, Solomonic, and Greek mystery school symbolism. US Founding Fathers (Washington, Franklin, Jefferson) were Masons. Dollar bill has the Eye of Providence pyramid from Egyptian/Masonic tradition.", status: "PARTIALLY CONFIRMED" },
        { topic: "Alexander's empire spread Greek religion as soft power", detail: "Alexander (356–323 BC) founded 70+ cities, each with Greek temples and culture. This 'Hellenization' created the cultural framework that allowed Christianity to spread — the New Testament was written in Greek, not Hebrew.", status: "CONFIRMED" },
      ],
    },
  },

  // ── Religion timeline (for the panel) ─────────────────────────────────────
  timeline: [
    { year: -3000, event: "Egyptian religion", detail: "Pharaoh as god-king. Osiris resurrection myth predates Christianity by 3,000 years. Mystery school rituals in temples." },
    { year: -800,  event: "Greek mythology peaks", detail: "Olympic gods shape law, war, and politics across the Mediterranean. Plato and Aristotle lay intellectual foundations." },
    { year: -500,  event: "Torah compiled", detail: "Jewish scribes codify the Torah during Babylonian exile. Monotheism spreads." },
    { year: -330,  event: "Alexander Hellenizes the world", detail: "Greek language and culture spread from Egypt to India — setting the stage for Christianity's spread." },
    { year: -63,   event: "Rome conquers Judea", detail: "Roman occupation creates the political context for Jesus of Nazareth's ministry and execution." },
    { year: 30,    event: "Jesus crucified", detail: "Roman execution of Jesus becomes the founding event of Christianity. Paul of Tarsus spreads it across the Roman Empire." },
    { year: 313,   event: "Edict of Milan", detail: "Emperor Constantine legalises Christianity. Rome adopts it — transforming a persecuted sect into imperial religion." },
    { year: 380,   event: "Christianity = Roman state religion", detail: "Theodosius I makes Christianity official. Pagan temples converted or destroyed. Church and Empire merge." },
    { year: 570,   event: "Muhammad born", detail: "Born in Mecca. At 40 receives first revelations. Islam rises as a direct challenge to Byzantine (Christian) and Persian (Zoroastrian) empires." },
    { year: 632,   event: "Muhammad dies — Sunni/Shia split", detail: "Abu Bakr chosen as Caliph (Sunni). Ali (cousin/son-in-law) overlooked. Ali's followers become Shia. This split still drives Middle East wars today." },
    { year: 750,   event: "Islamic Golden Age", detail: "Abbasid Caliphate (Baghdad). Muslim scholars preserve and advance Greek philosophy, mathematics, astronomy while Europe is in the Dark Ages." },
    { year: 1054,  event: "Great Schism", detail: "Catholic (Rome) and Orthodox (Constantinople) churches split over papal authority. Russia becomes Orthodox — directly relevant to today's geopolitics." },
    { year: 1095,  event: "First Crusade", detail: "Pope Urban II launches holy war to retake Jerusalem. Real motives: trade routes, land, Byzantine wealth. 9 Crusades over 200 years." },
    { year: 1307,  event: "Knights Templar dissolved", detail: "King Philip IV of France arrests and tortures the Templars, takes their wealth. They were the first international banking system. Conspiracy theories of underground survival persist." },
    { year: 1453,  event: "Ottoman conquest of Constantinople", detail: "Islam takes the seat of Orthodox Christianity. Starts 600 years of Ottoman control of Middle East and Southeast Europe." },
    { year: 1517,  event: "Protestant Reformation", detail: "Luther's 95 Theses break Catholic monopoly. Gives rise to Northern European capitalism, nationalism, the printing press, and modern individualism." },
    { year: 1534,  event: "Church of England created", detail: "Henry VIII splits from Rome to get a divorce. The British Empire and Anglican church become inseparable — religion as imperial tool." },
    { year: 1717,  event: "Freemasonry founded (London)", detail: "Grand Lodge established. Absorbs symbols from Templar, Kabbalistic, Egyptian and Greek mystery traditions. Spreads through Enlightenment élite." },
    { year: 1776,  event: "USA founded by Masons", detail: "Washington, Franklin, Jefferson all Freemasons. Dollar bill's Eye of Providence, Novus Ordo Seclorum ('New Order of the Ages') reflect Masonic/Enlightenment ideology." },
    { year: 1830,  event: "Wahhabism spreads", detail: "Muhammad ibn Abd al-Wahhab's puritan Sunni movement partners with Saudi dynasty. Later exported globally via oil money after 1973." },
    { year: 1897,  event: "Zionism founded", detail: "Theodor Herzl's First Zionist Congress. Seeks a Jewish homeland. Balfour Declaration 1917 makes it British policy." },
    { year: 1916,  event: "Sykes-Picot Agreement", detail: "Britain and France secretly divide the Ottoman Middle East with a ruler — creating Iraq, Syria, Lebanon, Jordan. Ignores all religious/tribal lines. Root of almost every Middle East conflict." },
    { year: 1948,  event: "Israel founded / Nakba", detail: "UN creates Israel. 700,000 Palestinians flee or are expelled (the Nakba). Starts the Israel-Palestine conflict that shapes global geopolitics to this day." },
    { year: 1979,  event: "Iranian Islamic Revolution", detail: "Ayatollah Khomeini overthrows the Shah. Iran becomes a Shia theocracy. Starts the modern Iran–Saudi proxy war and shifts the entire Middle East order." },
    { year: 2001,  event: "9/11 and the 'War on Terror'", detail: "15 of 19 hijackers were Saudi (Wahhabi/Salafi). USA invades Afghanistan, then Iraq (2003). Destroys the Sunni state structure, empowers Shia Iran — exactly the opposite of stated goals." },
  ],
};
