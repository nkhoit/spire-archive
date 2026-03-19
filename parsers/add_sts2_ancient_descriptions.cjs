#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data', 'sts2', 'localization');
const ANC_DIR = '/tmp/sts2-pck/localization';

const LANG_MAP = {
  deu: 'de',
  fra: 'fr',
  ita: 'it',
  spa: 'es',
  ptb: 'pt',
  pol: 'pl',
  rus: 'ru',
  tur: 'tr',
  tha: 'th',
  jpn: 'ja',
  kor: 'ko',
  zhs: 'zh',
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

const descriptions = {
  de: {
    PAEL: 'Pael, der Schmelzende Drache, bietet dir drei Reliktoptionen aus verdrehten Pools aus Fleisch, Flügeln und Augen an. Bei jeder Begegnung erscheint je ein Relikt aus Pool 1, Pool 2 und Pool 3; zusätzliche Optionen können auftauchen, wenn dein Deck oder deine Begleiter Paels seltsame Bedingungen erfüllen.',
    DARV: 'Darv, Der Hortende, wühlt in einem Haufen mächtiger Relikte und präsentiert dir einen wechselnden Vorrat. Du siehst Dusty Tome sowie drei zufällige Relikte aus dem Hauptpool und aktspezifischen Sets, wobei manche Optionen nur unter bestimmten Bedingungen erscheinen.',
    OROBAS: 'Orobas, der Lebendige Regenbogen, breitet ein Spektrum von Relikten über drei verschiedene Pools aus. Bei jeder Begegnung wird dir ein Relikt aus jedem Pool angeboten; Prismatic Gem kommt für Charaktere hinzu, die Orbs kanalisieren können.',
    TANX: 'Tanx, der Khimären-König, rüstet dich aus einem brutalen Waffenlager aus. Bei jeder Begegnung werden drei zufällige Relikte aus Tanx\' Arsenal angeboten; Tri-Boomerang kommt hinzu, wenn du bereits genug Waffen trägst, um den König zu beeindrucken.',
    TEZCATARA: 'Tezcatara, Das, was das Feuer füttert, legt seine Gaben in drei sorgfältig vorbereiteten Pools aus. Bei jeder Begegnung wird dir ein Relikt aus jedem Pool angeboten, von stärkenden Leckereien bis zu seltsamen Erinnerungsstücken und kostbaren Kuriositäten.',
    NONUPEIPE: 'Nonupeipe, Personifiziertes Glück, umgibt dich mit einer funkelnden Sammlung glücksbringender Schätze. Bei jedem Besuch werden drei zufällige Relikte aus dem Hauptpool angeboten; Beautiful Bracelet erscheint nur, wenn seine besondere Bedingung erfüllt ist.',
    VAKUU: 'Vakuu, der Erste Dämon, lockt dich mit Relikten aus drei unheilvollen Pools. Bei jeder Begegnung wird dir ein Relikt aus jedem Pool angeboten — blutige Abmachungen, konservierte Trophäen und elegante dämonische Zierstücke.',
    THE_ARCHITECT: 'Der Architekt erwartet dich am Ende jedes erfolgreichen Laufs. Die Begegnung entfaltet sich als Dialog mit charakterspezifischen Zeilen und gipfelt in einer letzten Konfrontation.',
  },
  fr: {
    PAEL: 'Pael, le Dragon de Cire, propose trois choix de reliques tirés de pools de chair, d\'ailes et d\'yeux déformés. À chaque rencontre, une relique de chaque pool est proposée, avec des options supplémentaires qui peuvent apparaître si votre deck ou vos compagnons remplissent les étranges conditions de Pael.',
    DARV: 'Darv, l\'Amasseur, fouille dans un tas de puissantes reliques et vous présente une réserve changeante. Vous voyez Dusty Tome ainsi que trois reliques aléatoires issues du pool principal et d\'ensembles liés à l\'acte, certaines options n\'apparaissant que sous conditions.',
    OROBAS: 'Orobas, l\'Arc-en-ciel Vivant, déploie un spectre de reliques réparties en trois pools distincts. Chaque rencontre propose une relique de chaque pool, et Prismatic Gem s\'ajoute pour les personnages capables de canaliser des Orbes.',
    TANX: 'Tanx, le Roi Chimère, vous arme depuis une réserve d\'armes brutale. Chaque rencontre propose trois reliques aléatoires tirées de l\'arsenal de Tanx, avec Tri-Boomerang en plus si vous portez déjà assez d\'armes pour impressionner le roi.',
    TEZCATARA: 'Tezcatara, Nourricière de la Flamme, dispose ses dons dans trois pools soigneusement préparés. Chaque rencontre propose une relique de chaque pool, allant de douceurs réconfortantes à d\'étranges souvenirs et précieuses curiosités.',
    NONUPEIPE: 'Nonupeipe, l\'Incarnation de la Fortune, vous entoure d\'une collection étincelante de trésors porte-bonheur. Chaque visite propose trois reliques aléatoires du pool principal, Beautiful Bracelet n\'apparaissant que si sa condition spéciale est remplie.',
    VAKUU: 'Vakuu, le Premier Démon, vous tente avec des reliques réparties en trois pools inquiétants. Chaque rencontre propose une relique de chaque pool, mêlant pactes sanglants, trophées préservés et élégants atours démoniaques.',
    THE_ARCHITECT: 'L\'Architecte vous attend à la fin de chaque run victorieuse. La rencontre se déroule comme un dialogue aux répliques propres à chaque personnage avant d\'aboutir à un affrontement final.',
  },
  it: {
    PAEL: 'Pael, il Drago fuso, offre tre reliquie pescate da pool contorti di carne, ali e occhi. In ogni incontro compare una reliquia da ciascun pool, con opzioni aggiuntive che possono apparire se il tuo mazzo o i tuoi compagni soddisfano le strane condizioni di Pael.',
    DARV: 'Darv, l\'Accumulatore, fruga in un mucchio di potenti reliquie e ti presenta una scorta sempre diversa. Ti mostra Dusty Tome più tre reliquie casuali dal pool principale e dai set legati all\'atto, con alcune opzioni disponibili solo in particolari condizioni.',
    OROBAS: 'Orobas, l\'Arcobaleno vivente, dispone uno spettro di reliquie in tre pool distinti. Ogni incontro offre una reliquia per pool, con Prismatic Gem che si aggiunge per i personaggi in grado di incanalare Sfere.',
    TANX: 'Tanx, il Re chimera, ti arma da un brutale arsenale. Ogni incontro offre tre reliquie casuali dall\'arsenale di Tanx, con Tri-Boomerang aggiunto se possiedi già abbastanza armi da impressionare il re.',
    TEZCATARA: 'Tezcatara, l\'essere che alimenta il fuoco, dispone i suoi doni in tre pool preparati con cura. Ogni incontro offre una reliquia da ciascun pool, da confortanti leccornie a strani cimeli e preziose curiosità.',
    NONUPEIPE: 'Nonupeipe, l\'incarnazione della fortuna, ti circonda con una scintillante collezione di tesori fortunati. Ogni visita offre tre reliquie casuali dal pool principale, mentre Beautiful Bracelet compare solo se la sua condizione speciale è soddisfatta.',
    VAKUU: 'Vakuu, il primo demone, ti tenta con reliquie divise in tre pool minacciosi. Ogni incontro offre una reliquia da ciascun pool, mescolando patti insanguinati, trofei conservati ed eleganti finimenti demoniaci.',
    THE_ARCHITECT: 'L\'Architetto ti attende al termine di ogni corsa vittoriosa. L\'incontro si svolge come un dialogo con battute specifiche per ogni personaggio e culmina in uno scontro finale.',
  },
  es: {
    PAEL: 'Pael, el Dragón fundido, ofrece tres reliquias extraídas de retorcidos conjuntos de carne, alas y ojos. Cada encuentro muestra una reliquia de cada grupo, con opciones extra que pueden aparecer si tu mazo o tus compañeros cumplen las peculiares condiciones de Pael.',
    DARV: 'Darv, el Coleccionista, rebusca entre una pila de reliquias poderosas y te presenta un surtido cambiante. Ves Dusty Tome junto con tres reliquias aleatorias del grupo principal y de conjuntos específicos del acto, y algunas opciones solo aparecen si se cumplen ciertas condiciones.',
    OROBAS: 'Orobas, el Arcoíris viviente, despliega un espectro de reliquias repartidas en tres grupos distintos. Cada encuentro ofrece una reliquia de cada grupo, y Prismatic Gem se suma para los personajes capaces de canalizar Orbes.',
    TANX: 'Tanx, el Rey de las quimeras, te arma desde un brutal arsenal. Cada encuentro ofrece tres reliquias aleatorias del arsenal de Tanx, con Tri-Boomerang añadido si ya llevas suficientes armas como para impresionar al rey.',
    TEZCATARA: 'Tezcatara, lo que alimenta el fuego, coloca sus dones en tres grupos cuidadosamente preparados. Cada encuentro ofrece una reliquia de cada grupo, desde dulces reconfortantes hasta extraños recuerdos y valiosas curiosidades.',
    NONUPEIPE: 'Nonupeipe, la Serendipia personificada, te rodea con una brillante colección de tesoros afortunados. Cada visita ofrece tres reliquias aleatorias del grupo principal, y Beautiful Bracelet solo aparece si se cumple su condición especial.',
    VAKUU: 'Vakuu, el primer demonio, te tienta con reliquias repartidas en tres grupos ominosos. Cada encuentro ofrece una reliquia de cada grupo, mezclando pactos sangrientos, trofeos preservados y elegantes galas demoníacas.',
    THE_ARCHITECT: 'El Arquitecto te espera al final de cada carrera exitosa. El encuentro se desarrolla como un diálogo con líneas específicas de cada personaje y culmina en una confrontación final.',
  },
  pt: {
    PAEL: 'Pael, o Dragão Fundente, oferece três escolhas de relíquias vindas de conjuntos distorcidos de carne, asas e olhos. Em cada encontro aparece uma relíquia de cada conjunto, com opções extras surgindo se seu baralho ou seus companheiros atenderem às condições peculiares de Pael.',
    DARV: 'Darv, o Acumulador, revira uma pilha de relíquias poderosas e apresenta um estoque sempre diferente. Você vê Dusty Tome mais três relíquias aleatórias vindas do conjunto principal e de conjuntos específicos do ato, com algumas opções aparecendo apenas sob certas condições.',
    OROBAS: 'Orobas, o Arco-íris Vivente, espalha um espectro de relíquias em três conjuntos distintos. Cada encontro oferece uma relíquia de cada conjunto, e Prismatic Gem entra na seleção para personagens capazes de canalizar Orbes.',
    TANX: 'Tanx, o Rei Quimera, equipa você a partir de um arsenal brutal. Cada encontro oferece três relíquias aleatórias do arsenal de Tanx, com Tri-Boomerang adicionado se você já carregar armas suficientes para impressionar o rei.',
    TEZCATARA: 'Tezcatara, Aquela Que Alimenta o Fogo, dispõe seus presentes em três conjuntos cuidadosamente preparados. Cada encontro oferece uma relíquia de cada conjunto, desde guloseimas reconfortantes até lembranças estranhas e curiosidades valiosas.',
    NONUPEIPE: 'Nonupeipe, a Serendipidade Encarnada, cerca você com uma coleção brilhante de tesouros afortunados. Cada visita oferece três relíquias aleatórias do conjunto principal, e Beautiful Bracelet só aparece quando sua condição especial é atendida.',
    VAKUU: 'Vakuu, o Primeiro Demônio, tenta você com relíquias divididas em três conjuntos sombrios. Cada encontro oferece uma relíquia de cada conjunto, misturando pactos sangrentos, troféus preservados e elegantes adornos demoníacos.',
    THE_ARCHITECT: 'O Arquiteto espera por você ao fim de cada jornada bem-sucedida. O encontro se desenrola como um diálogo com falas específicas de cada personagem e culmina em um confronto final.',
  },
  pl: {
    PAEL: 'Pael, Topniejący Smok, oferuje trzy relikty dobierane z pokręconych pul ciała, skrzydeł i oczu. Przy każdym spotkaniu pojawia się po jednym relikcie z każdej puli, a dodatkowe opcje mogą dojść, jeśli twoja talia lub towarzysze spełniają osobliwe warunki Paela.',
    DARV: 'Darv, Zbieracz, grzebie w stercie potężnych reliktów i pokazuje stale zmieniający się zapas. Otrzymujesz wgląd w Dusty Tome oraz trzy losowe relikty z głównej puli i zestawów zależnych od aktu, a część opcji pojawia się tylko przy spełnieniu warunków.',
    OROBAS: 'Orobas, Żywa Tęcza, rozkłada wachlarz reliktów na trzy różne pule. Każde spotkanie oferuje po jednym relikcie z każdej puli, a Prismatic Gem dołącza dla postaci zdolnych do kanalizowania Orbów.',
    TANX: 'Tanx, Chimera Królewska, uzbraja cię z brutalnego arsenału. Każde spotkanie oferuje trzy losowe relikty z arsenału Tanxa, a Tri-Boomerang dochodzi do puli, jeśli masz już dość broni, by zaimponować królowi.',
    TEZCATARA: 'Tezcatara, To, co karmi ogień, rozkłada swoje dary w trzech starannie przygotowanych pulach. Każde spotkanie oferuje po jednym relikcie z każdej puli — od pokrzepiających smakołyków po dziwne pamiątki i cenne osobliwości.',
    NONUPEIPE: 'Nonupeipe, Szczęście Wcielone, otacza cię lśniącą kolekcją szczęśliwych skarbów. Każda wizyta oferuje trzy losowe relikty z głównej puli, a Beautiful Bracelet pojawia się tylko po spełnieniu specjalnego warunku.',
    VAKUU: 'Vakuu, Pierwszy Demon, kusi cię reliktami podzielonymi na trzy złowrogie pule. Każde spotkanie oferuje po jednym relikcie z każdej puli, mieszając krwawe układy, zakonserwowane trofea i eleganckie demoniczne ozdoby.',
    THE_ARCHITECT: 'Architekt czeka na końcu każdego zwycięskiego biegu. Spotkanie przebiega jako dialog z kwestiami zależnymi od postaci i kończy się ostateczną konfrontacją.',
  },
  ru: {
    PAEL: 'Паэль, Тающий дракон, предлагает три реликвии из причудливых наборов плоти, крыльев и глаз. В каждой встрече появляется по одной реликвии из каждого пула, а дополнительные варианты открываются, если ваша колода или спутники соответствуют странным условиям Паэля.',
    DARV: 'Дарв, Антиквар, роется в груде мощных реликвий и показывает меняющийся запас. Вам предлагают Dusty Tome и ещё три случайные реликвии из основного пула и актовых наборов, причём некоторые варианты доступны только при выполнении условий.',
    OROBAS: 'Оробас, Живая радуга, раскладывает спектр реликвий по трём отдельным пулам. В каждой встрече предлагается по одной реликвии из каждого пула, а Prismatic Gem добавляется для персонажей, способных направлять Сферы.',
    TANX: 'Танкс, Король-химера, вооружает вас из жестокого арсенала. В каждой встрече предлагаются три случайные реликвии из арсенала Танкса, а Tri-Boomerang добавляется, если у вас уже достаточно оружия, чтобы впечатлить короля.',
    TEZCATARA: 'Тезкатара, Хранительница огня, раскладывает свои дары по трём тщательно подготовленным пулам. В каждой встрече предлагается по одной реликвии из каждого пула — от согревающих угощений до странных памятных вещей и редких диковинок.',
    NONUPEIPE: 'Нонупейпе, воплощённая удача, окружает вас сияющей коллекцией счастливых сокровищ. При каждом визите предлагаются три случайные реликвии из основного пула, а Beautiful Bracelet появляется только при выполнении особого условия.',
    VAKUU: 'Вакуу, Первый демон, искушает вас реликвиями, разделёнными на три зловещих пула. В каждой встрече предлагается по одной реликвии из каждого пула — кровавые сделки, сохранённые трофеи и изящные демонические украшения.',
    THE_ARCHITECT: 'Архитектор ждёт вас в конце каждого успешного забега. Эта встреча разворачивается как диалог с уникальными репликами для разных персонажей и заканчивается финальным противостоянием.',
  },
  tr: {
    PAEL: 'Pael, Eriyen Ejderha, et, kanat ve göz temalı tuhaf havuzlardan üç kalıntı seçeneği sunar. Her karşılaşmada her havuzdan bir kalıntı görünür; desteniz ya da yoldaşlarınız Pael\'in garip koşullarını karşılıyorsa ek seçenekler de çıkabilir.',
    DARV: 'Darv, İstifçi, güçlü kalıntılarla dolu bir yığını karıştırır ve size sürekli değişen bir stok sunar. Dusty Tome ile birlikte ana havuzdan ve perdeye özel setlerden üç rastgele kalıntı gösterilir; bazı seçenekler yalnızca belirli koşullarda görünür.',
    OROBAS: 'Orobas, Canlı Gökkuşağı, kalıntılardan oluşan bir tayfı üç ayrı havuza yayar. Her karşılaşma her havuzdan bir kalıntı sunar; Prismatic Gem ise Küre kanalize edebilen karakterler için seçime eklenir.',
    TANX: 'Tanx, Kimera Kral, sizi acımasız bir cephanelikten donatır. Her karşılaşma Tanx\'ın cephaneliğinden üç rastgele kalıntı sunar; kralı etkileyecek kadar çok silah taşıyorsanız Tri-Boomerang da eklenir.',
    TEZCATARA: 'Tezcatara, Ateşi Besleyen Varlık, armağanlarını özenle hazırlanmış üç havuza dizer. Her karşılaşma her havuzdan bir kalıntı sunar; rahatlatıcı ikramlardan tuhaf hatıralara ve değerli acayipliklere kadar uzanır.',
    NONUPEIPE: 'Nonupeipe, Tesadüfün Vücut Bulmuş Hali, sizi şans getiren hazinelerden oluşan parıltılı bir koleksiyonla çevreler. Her ziyaret ana havuzdan üç rastgele kalıntı sunar; Beautiful Bracelet ise yalnızca özel koşulu sağlandığında görünür.',
    VAKUU: 'Vakuu, İlk Şeytan, sizi üç uğursuz havuza ayrılmış kalıntılarla baştan çıkarır. Her karşılaşma her havuzdan bir kalıntı sunar; kanlı pazarlıklar, korunmuş ganimetler ve zarif şeytani süsler bir araya gelir.',
    THE_ARCHITECT: 'Mimar, her başarılı koşunun sonunda sizi bekler. Karşılaşma, karaktere özgü satırlarla ilerleyen bir diyalog olarak açılır ve nihai bir yüzleşmeyle son bulur.',
  },
  th: {
    PAEL: 'Pael มังกรหลอมละลาย มอบตัวเลือกรีลิกสามชิ้นจากกลุ่มเนื้อ ปีก และดวงตาอันบิดเบี้ยว ในแต่ละครั้งจะมีรีลิกจากแต่ละพูลอย่างละหนึ่งชิ้น และอาจมีตัวเลือกเพิ่มหากเด็คหรือสหายของคุณตรงตามเงื่อนไขประหลาดของ Pael',
    DARV: 'Darv นักสะสม คุ้ยกองรีลิกทรงพลังแล้วหยิบชุดของรางวัลที่เปลี่ยนไปเรื่อย ๆ มาให้ คุณจะเห็น Dusty Tome พร้อมรีลิกสุ่มอีกสามชิ้นจากพูลหลักและชุดตามแอ็กต์ โดยบางตัวเลือกจะปรากฏก็ต่อเมื่อเข้าเงื่อนไข',
    OROBAS: 'Orobas สายรุ้งมีชีวิต กางสเปกตรัมของรีลิกออกเป็นสามพูลแยกกัน แต่ละการพบกันจะเสนอรีลิกจากแต่ละพูลอย่างละหนึ่งชิ้น และ Prismatic Gem จะถูกเพิ่มเข้ามาสำหรับตัวละครที่มีช่องออร์บ',
    TANX: 'Tanx ราชาไคเมรา จัดอาวุธให้คุณจากคลังอาวุธอันดุดัน แต่ละการพบกันจะเสนอรีลิกสุ่มสามชิ้นจากคลังของ Tanx และจะมี Tri-Boomerang เพิ่มเข้ามาหากคุณถืออาวุธมากพอจะทำให้ราชาประทับใจ',
    TEZCATARA: 'Tezcatara ผู้หล่อเลี้ยงไฟ จัดของกำนัลไว้ในสามพูลอย่างพิถีพิถัน แต่ละการพบกันจะเสนอรีลิกจากแต่ละพูลอย่างละหนึ่งชิ้น ตั้งแต่ของกินชวนอบอุ่นไปจนถึงของที่ระลึกประหลาดและของล้ำค่า',
    NONUPEIPE: 'Nonupeipe ผู้เป็นรูปธรรมของโชคดี รายล้อมคุณด้วยคอลเลกชันสมบัตินำโชคที่เปล่งประกาย ทุกครั้งที่พบจะเสนอรีลิกสุ่มสามชิ้นจากพูลหลัก และ Beautiful Bracelet จะปรากฏเมื่อเข้าเงื่อนไขพิเศษเท่านั้น',
    VAKUU: 'Vakuu ปีศาจตนแรก ยั่วยวนคุณด้วยรีลิกที่ถูกแบ่งเป็นสามพูลอันน่าครั่นคร้าม แต่ละการพบกันจะเสนอรีลิกจากแต่ละพูลอย่างละหนึ่งชิ้น ทั้งข้อตกลงนองเลือด ถ้วยรางวัลที่เก็บรักษาไว้ และเครื่องประดับปีศาจอันสง่างาม',
    THE_ARCHITECT: 'The Architect รออยู่ในตอนจบของทุกการวิ่งที่ประสบความสำเร็จ การเผชิญหน้าครั้งนี้ดำเนินไปในรูปแบบบทสนทนาที่มีบรรทัดเฉพาะของแต่ละตัวละคร ก่อนจะจบลงด้วยการปะทะครั้งสุดท้าย',
  },
  ja: {
    PAEL: 'パエル、溶けるドラゴンは、肉体・翼・眼にまつわる歪んだプールから3つのレリック候補を差し出す。遭遇ごとに各プールから1つずつ提示され、デッキや仲間がパエルの奇妙な条件を満たしていれば追加候補が混ざることもある。',
    DARV: 'ダーヴ、収集家は、強力なレリックの山をあさり、毎回異なる品揃えを見せてくる。Dusty Tomeに加え、メインプールとAct別セットからランダムな3つが提示され、一部の候補は条件を満たしたときだけ現れる。',
    OROBAS: 'オロバス、生きた虹は、レリックのスペクトルを3つの異なるプールに広げる。遭遇ごとに各プールから1つずつ提示され、オーブを扱えるキャラクターにはPrismatic Gemも候補に加わる。',
    TANX: 'タンक्स、キメラ王は、獰猛な武器庫から装備を与える。遭遇ごとにタンक्सの武器庫からランダムな3つのレリックが提示され、すでに十分な武器を持っていればTri-Boomerangも候補に加わる。',
    TEZCATARA: 'テズカタラ、炎を喰らう者は、3つの丁寧に用意されたプールに贈り物を並べる。遭遇ごとに各プールから1つずつ提示され、心温まる食べ物から奇妙な記念品や貴重な珍品までが並ぶ。',
    NONUPEIPE: 'ノヌペイペ、美と幸運の化身は、きらめく幸運の宝物であなたを取り囲む。訪れるたびにメインプールからランダムな3つのレリックが提示され、Beautiful Braceletは特別な条件を満たしたときだけ現れる。',
    VAKUU: 'ヴァクー、最初の悪魔は、3つの不吉なプールに分けられたレリックであなたを誘惑する。遭遇ごとに各プールから1つずつ提示され、血塗られた取引、保存された戦利品、優美な悪魔の装飾品が並ぶ。',
    THE_ARCHITECT: 'アーキテクトは、成功したランの終わりごとに待ち受けている。この遭遇はキャラクターごとの台詞を交えた対話として進行し、最後の対決へと至る。',
  },
  ko: {
    PAEL: '파엘, 녹아내리는 용은 살점과 날개, 눈으로 이뤄진 뒤틀린 풀에서 세 가지 유물 선택지를 내민다. 만날 때마다 각 풀에서 하나씩 제시되며, 덱이나 동료가 파엘의 기묘한 조건을 충족하면 추가 선택지가 섞여 들어올 수 있다.',
    DARV: '다르브, 수집광은 강력한 유물 더미를 뒤져 매번 달라지는 비축품을 보여 준다. Dusty Tome과 함께 메인 풀과 액트별 세트에서 무작위 유물 세 개가 제시되며, 일부 선택지는 조건을 만족해야만 등장한다.',
    OROBAS: '오로바스, 살아있는 무지개는 세 개의 서로 다른 풀에 걸쳐 유물의 스펙트럼을 펼쳐 놓는다. 매번 각 풀에서 하나씩 제시되며, 오브 슬롯이 있는 캐릭터에게는 Prismatic Gem도 선택지에 추가된다.',
    TANX: '탄크스, 키메라 왕은 난폭한 무기고에서 장비를 내린다. 만날 때마다 탄크스의 무기고에서 무작위 유물 세 개가 제시되며, 이미 무기를 충분히 보유하고 있다면 Tri-Boomerang도 추가된다.',
    TEZCATARA: '테즈카타라, 불을 키우는 자는 정성스럽게 준비한 세 개의 풀에 선물을 펼쳐 놓는다. 매번 각 풀에서 하나씩 제시되며, 든든한 간식부터 기묘한 기념품과 귀중한 진귀품까지 다양하게 섞여 있다.',
    NONUPEIPE: '노누페이페, 우연한 행운의 화신은 반짝이는 행운의 보물들로 당신을 둘러싼다. 방문할 때마다 메인 풀에서 무작위 유물 세 개가 제시되며, Beautiful Bracelet은 특별한 조건을 만족할 때만 나타난다.',
    VAKUU: '바쿠, 최초의 악마는 세 개의 불길한 풀로 나뉜 유물들로 당신을 유혹한다. 매번 각 풀에서 하나씩 제시되며, 피 묻은 거래와 보존된 전리품, 우아한 악마의 장식품이 함께 섞여 나온다.',
    THE_ARCHITECT: '아키텍트는 성공적인 런의 끝마다 당신을 기다린다. 이 만남은 캐릭터별 대사가 포함된 대화 형식으로 진행되며, 마지막 대결로 이어진다.',
  },
  zh: {
    PAEL: '帕艾尔，融化巨龙，会从血肉、翅翼与眼瞳构成的扭曲池中提供三件遗物候选。每次相遇都会从三个池子里各给出一件；如果你的牌组或伙伴满足帕艾尔那些古怪条件，还会混入额外选项。',
    DARV: '达尔弗，囤积者，会在一堆强力遗物中翻找，并拿出一批不断变化的收藏。你会看到 Dusty Tome，以及从主池和章节专属池中抽出的三件随机遗物；其中部分选项只有满足条件时才会出现。',
    OROBAS: '欧罗巴斯，活体虹光，将一整道遗物光谱铺陈为三个不同的池子。每次相遇都会从每个池子里各提供一件；对拥有充能球栏位的角色，还会额外加入 Prismatic Gem。',
    TANX: '坦克斯，嵌合兽之王，会从残酷的武器库中为你挑选装备。每次相遇都会从坦克斯的武器库中提供三件随机遗物；如果你已持有足够多的武器，还会加入 Tri-Boomerang。',
    TEZCATARA: '特兹卡塔拉，饲火者，会把赠礼分放在三个精心准备的池子里。每次相遇都会从每个池子里各提供一件，从令人安心的食物到古怪纪念品与珍贵奇物一应俱全。',
    NONUPEIPE: '诺努佩佩，机缘的化身，会用一整套闪耀的幸运珍宝将你包围。每次造访都会从主池中提供三件随机遗物；Beautiful Bracelet 只有在满足特殊条件时才会出现。',
    VAKUU: '瓦库，第一个恶魔，会用分成三个不祥池子的遗物诱惑你。每次相遇都会从每个池子里各提供一件，既有血腥契约，也有保存完好的战利品与华丽的恶魔饰物。',
    THE_ARCHITECT: '建筑师会在每次成功通关的终点等待你。这场遭遇以带有角色专属台词的对话展开，并最终走向最后的决战。',
  },
};

for (const [gameLang, isoLang] of Object.entries(LANG_MAP)) {
  const outFile = path.join(OUT_DIR, `${isoLang}.json`);
  const data = readJson(outFile);
  data.events ||= {};

  const ancientsPath = path.join(ANC_DIR, gameLang, 'ancients.json');
  const ancients = fs.existsSync(ancientsPath) ? readJson(ancientsPath) : {};
  const localeDescriptions = descriptions[isoLang];
  if (!localeDescriptions) continue;

  for (const [eventId, description] of Object.entries(localeDescriptions)) {
    data.events[eventId] ||= {};
    data.events[eventId].description = description;

    if (!data.events[eventId].name) {
      const epithet = ancients[`${eventId}.epithet`];
      if (epithet && !data.events[eventId].epithet) data.events[eventId].epithet = epithet;
    }
  }

  writeJson(outFile, data);
  console.log(`Updated ${isoLang}`);
}
