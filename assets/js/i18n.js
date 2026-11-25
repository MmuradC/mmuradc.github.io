/* i18n.js — site localisation for mmuradc.github.io
   ────────────────────────────────────────────────────────────────────────
   How it works
   • window.MMC_I18N holds every UI string in every supported language.
   • Each page marks text with data-i18n="key" (textContent) or
     data-i18n-attr="placeholder:key;title:key" (attributes).
   • applyI18n() walks those nodes and swaps the text; the chosen language
     lives in localStorage and can be forced with ?lang=xx.
   • Content that comes from INFO.md (bio, project descriptions) is *not*
     duplicated here: if data.js exposes a translations map for the current
     language, it is used; otherwise the English content stays.
   • No build step, no network: works from file:// and on GitHub Pages.     */

(function () {
  'use strict';

  const LANGS = [
    ['en', 'English'],
    ['tr', 'Türkçe'],
    ['zh', '中文'],
    ['hi', 'हिन्दी'],
    ['es', 'Español'],
    ['fr', 'Français'],
    ['ar', 'العربية'],
    ['bn', 'বাংলা'],
    ['ru', 'Русский'],
    ['pt', 'Português'],
    ['id', 'Indonesia'],
    ['de', 'Deutsch'],
    ['ja', '日本語'],
    ['ko', '한국어'],
    ['it', 'Italiano']
  ];
  const RTL = { ar: true };

  const S = {
    en: {
      'nav.main': 'MAIN', 'nav.about': 'ABOUT', 'nav.game': 'GAME', 'nav.code': 'CODE',
      'nav.lang': 'language',
      'index.welcome': 'welcome',
      'index.tagline': 'computer engineer · game dev · researcher',
      'index.hint': 'click the water — it hears you',
      'index.nav.about': 'about me', 'index.nav.game': 'game', 'index.nav.code': 'code',
      'title.index': 'Muhammed Murad Chamaa',
      'about.title': 'About Me — Muhammed Murad Chamaa',
      'about.heading': 'about me',
      'about.sub': 'computer engineer · game dev · researcher',
      'about.sub2': 'usually here, after dark',
      'about.admin': 'for admin: this page reads',
      'about.admin2': 'to update it',
      'about.note': "if you're reading this at 3am, we're the same kind of person — the build is either finished or it isn't, and either way you're still here.",
      'about.caption': 'me, pretending to be awake',
      'about.blurb': "Usually found between a compiler error and a coffee refill. If it's about games, quantum chips, or Linux, I'm already interested.",
      'about.nophoto': 'no photo yet',
      'about.nophoto2': '— add one to _assets —',
      'game.title': 'Games & Research — Muhammed Murad Chamaa',
      'game.heading': 'GAME',
      'game.sub': 'arcade cabinet at dusk — the ping-pong table behind the cards never sleeps',
      'game.research': 'RESEARCH',
      'game.scroll': 'scroll ↓ — the table keeps playing on its own',
      'game.artpending': 'art pending',
      'code.title': 'Code — Muhammed Murad Chamaa',
      'code.heading': 'CODE',
      'code.sub': 'resume rows × the little shell — it knows its way around this repo',
      'code.placeholder': 'try: help',
      'code.select': 'Select an entry. Or type',
      'code.select2': 'in the terminal — it knows the way around here.',
      'code.scrollcue': 'scrollable description panel — long entries scroll in their box',
      'code.bar': 'murad@gazi:~/resume',
      'term.booting': 'booting . . . ok',
      'term.loading': 'loading resume . . . ok',
      'term.loggedin': 'user murad logged in',
      'term.help': 'available commands:',
      'term.help.ls': 'list files',
      'term.help.cat': 'read a file (e.g. cat resume.txt)',
      'term.help.whoami': "who's this guy",
      'term.help.links': 'contact / profiles',
      'term.help.clear': 'clear the screen',
      'term.help.more': 'everything also lives in the resume rows on the right →',
      'term.nosuchfile': 'no such file',
      'term.notfound': 'command not found (try'
    },
    tr: {
      'nav.main': 'ANA', 'nav.about': 'HAKKIMDA', 'nav.game': 'OYUN', 'nav.code': 'KOD',
      'nav.lang': 'dil',
      'index.welcome': 'merhaba',
      'index.tagline': 'bilgisayar mühendisi · oyun geliştirici · araştırmacı',
      'index.hint': 'suya tıkla — seni duyar',
      'index.nav.about': 'hakkımda', 'index.nav.game': 'oyun', 'index.nav.code': 'kod',
      'title.index': 'Muhammed Murad Chamaa',
      'about.title': 'Hakkımda — Muhammed Murad Chamaa',
      'about.heading': 'hakkımda',
      'about.sub': 'bilgisayar mühendisi · oyun geliştirici · araştırmacı',
      'about.sub2': 'genelde buralarda, gece yarısından sonra',
      'about.admin': 'yönetici için: bu sayfa',
      'about.admin2': 'dosyasını okur, güncellemek için',
      'about.note': 'bunu gece 3’te okuyorsan aynı türden insanlarız — derleme ya bitti ya bitmedi, ama sen hâlâ buradasın.',
      'about.caption': 'ben, uyanık taklidi yaparken',
      'about.blurb': 'Genelde bir derleyici hatasıyla bir kahve molası arasında bulunurum. Oyun, kuantum çipi veya Linux ise zaten ilgileniyorum.',
      'about.nophoto': 'henüz fotoğraf yok',
      'about.nophoto2': '— _assets klasörüne ekle —',
      'game.title': 'Oyunlar ve Araştırma — Muhammed Murad Chamaa',
      'game.heading': 'OYUN',
      'game.sub': 'alacakaranlıkta atari dolabı — kartların arkasındaki pinpon masası hiç uyumaz',
      'game.research': 'ARAŞTIRMA',
      'game.scroll': 'kaydır ↓ — masa kendi kendine oynamaya devam eder',
      'game.artpending': 'görsel bekleniyor',
      'code.title': 'Kod — Muhammed Murad Chamaa',
      'code.heading': 'KOD',
      'code.sub': 'özgeçmiş satırları × küçük kabuk — bu depoyu iyi bilir',
      'code.placeholder': 'dene: help',
      'code.select': 'Bir satır seç. Ya da terminale',
      'code.select2': 'yaz — burada yolunu bilir.',
      'code.scrollcue': 'kaydırılabilir açıklama paneli — uzun satırlar kutusunda kayar',
      'code.bar': 'murad@gazi:~/ozgecmis',
      'term.booting': 'başlatılıyor . . . tamam',
      'term.loading': 'özgeçmiş yükleniyor . . . tamam',
      'term.loggedin': 'kullanıcı murad giriş yaptı',
      'term.help': 'kullanılabilir komutlar:',
      'term.help.ls': 'dosyaları listele',
      'term.help.cat': 'bir dosyayı oku (örn. cat ozgecmis.txt)',
      'term.help.whoami': 'bu adam da kim',
      'term.help.links': 'iletişim / profiller',
      'term.help.clear': 'ekranı temizle',
      'term.help.more': 'her şey sağdaki özgeçmiş satırlarında da var →',
      'term.nosuchfile': 'böyle bir dosya yok',
      'term.notfound': 'komut bulunamadı (dene'
    },
    zh: {
      'nav.main': '主页', 'nav.about': '关于', 'nav.game': '游戏', 'nav.code': '代码',
      'nav.lang': '语言',
      'index.welcome': '你好',
      'index.tagline': '计算机工程师 · 游戏开发者 · 研究者',
      'index.hint': '点一下水面 —— 它能听见你',
      'index.nav.about': '关于我', 'index.nav.game': '游戏', 'index.nav.code': '代码',
      'title.index': 'Muhammed Murad Chamaa',
      'about.title': '关于我 — Muhammed Murad Chamaa',
      'about.heading': '关于我',
      'about.sub': '计算机工程师 · 游戏开发者 · 研究者',
      'about.sub2': '通常在这里，入夜之后',
      'about.admin': '管理员：本页读取',
      'about.admin2': '如需更新请运行',
      'about.note': '如果你在凌晨三点读到这句，我们大概是同一种人——构建要么完成了，要么还没，而你依然在这里。',
      'about.caption': '我，假装还醒着',
      'about.blurb': '通常出现在编译错误和续杯咖啡之间。只要是游戏、量子芯片或 Linux，我都有兴趣。',
      'about.nophoto': '还没有照片',
      'about.nophoto2': '— 放到 _assets 里 —',
      'game.title': '游戏与研究 — Muhammed Murad Chamaa',
      'game.heading': '游戏',
      'game.sub': '黄昏里的街机柜 —— 卡片后面的乒乓球桌从不休息',
      'game.research': '研究',
      'game.scroll': '向下滚动 ↓ —— 球桌会自己一直打下去',
      'game.artpending': '图片待补',
      'code.title': '代码 — Muhammed Murad Chamaa',
      'code.heading': '代码',
      'code.sub': '简历行 × 小小终端 —— 它熟悉这个仓库',
      'code.placeholder': '试试：help',
      'code.select': '选择一条记录，或者在终端里输入',
      'code.select2': '—— 它认得这里的路。',
      'code.scrollcue': '可滚动说明面板 —— 长条目会在框内滚动',
      'code.bar': 'murad@gazi:~/简历',
      'term.booting': '启动中 . . . 完成',
      'term.loading': '正在加载简历 . . . 完成',
      'term.loggedin': '用户 murad 已登录',
      'term.help': '可用命令：',
      'term.help.ls': '列出文件',
      'term.help.cat': '读取文件（例如 cat 简历.txt）',
      'term.help.whoami': '这是谁',
      'term.help.links': '联系方式 / 主页',
      'term.help.clear': '清屏',
      'term.help.more': '所有内容也在右侧的简历行里 →',
      'term.nosuchfile': '没有这个文件',
      'term.notfound': '未找到命令（试试'
    },
    hi: {
      'nav.main': 'मुख्य', 'nav.about': 'परिचय', 'nav.game': 'गेम', 'nav.code': 'कोड',
      'nav.lang': 'भाषा',
      'index.welcome': 'नमस्ते',
      'index.tagline': 'कंप्यूटर इंजीनियर · गेम डेवलपर · शोधकर्ता',
      'index.hint': 'पानी पर क्लिक करें — यह सुनता है',
      'index.nav.about': 'मेरे बारे में', 'index.nav.game': 'गेम', 'index.nav.code': 'कोड',
      'title.index': 'Muhammed Murad Chamaa',
      'about.title': 'मेरे बारे में — Muhammed Murad Chamaa',
      'about.heading': 'मेरे बारे में',
      'about.sub': 'कंप्यूटर इंजीनियर · गेम डेवलपर · शोधकर्ता',
      'about.sub2': 'आमतौर पर यहीं, रात होने के बाद',
      'about.admin': 'एडमिन के लिए: यह पेज पढ़ता है',
      'about.admin2': 'अपडेट करने के लिए चलाएँ',
      'about.note': 'अगर यह रात 3 बजे पढ़ रहे हैं, तो हम एक जैसे लोग हैं — बिल्ड पूरा हुआ हो या नहीं, आप अब भी यहीं हैं।',
      'about.caption': 'मैं, जागा हुआ दिखाने की कोशिश में',
      'about.blurb': 'आमतौर पर कंपाइल एरर और कॉफ़ी रीफ़िल के बीच मिलता हूँ। गेम, क्वांटम चिप या Linux हो तो दिलचस्पी पहले से है।',
      'about.nophoto': 'अभी कोई फ़ोटो नहीं',
      'about.nophoto2': '— इसे _assets में डालें —',
      'game.title': 'गेम और शोध — Muhammed Murad Chamaa',
      'game.heading': 'गेम',
      'game.sub': 'शाम की आर्केड कैबिनेट — कार्डों के पीछे की पिंग-पॉन्ग टेबल कभी नहीं सोती',
      'game.research': 'शोध',
      'game.scroll': 'नीचे स्क्रॉल करें ↓ — टेबल खुद खेलती रहती है',
      'game.artpending': 'चित्र बाकी',
      'code.title': 'कोड — Muhammed Murad Chamaa',
      'code.heading': 'कोड',
      'code.sub': 'रिज़्यूमे पंक्तियाँ × छोटा शेल — यह इस रेपो को जानता है',
      'code.placeholder': 'आज़माएँ: help',
      'code.select': 'एक प्रविष्टि चुनें। या टर्मिनल में',
      'code.select2': 'लिखें — इसे यहाँ का रास्ता पता है।',
      'code.scrollcue': 'स्क्रॉल होने वाला विवरण पैनल — लंबी प्रविष्टियाँ बॉक्स में स्क्रॉल होती हैं',
      'code.bar': 'murad@gazi:~/resume',
      'term.booting': 'बूट हो रहा है . . . ठीक',
      'term.loading': 'रिज़्यूमे लोड हो रहा है . . . ठीक',
      'term.loggedin': 'उपयोगकर्ता murad लॉग इन हुआ',
      'term.help': 'उपलब्ध कमांड:',
      'term.help.ls': 'फ़ाइलें सूचीबद्ध करें',
      'term.help.cat': 'फ़ाइल पढ़ें (जैसे cat resume.txt)',
      'term.help.whoami': 'यह कौन है',
      'term.help.links': 'संपर्क / प्रोफ़ाइल',
      'term.help.clear': 'स्क्रीन साफ़ करें',
      'term.help.more': 'सब कुछ दाईं ओर रिज़्यूमे पंक्तियों में भी है →',
      'term.nosuchfile': 'ऐसी कोई फ़ाइल नहीं',
      'term.notfound': 'कमांड नहीं मिला (आज़माएँ'
    },
    es: {
      'nav.main': 'INICIO', 'nav.about': 'SOBRE MÍ', 'nav.game': 'JUEGOS', 'nav.code': 'CÓDIGO',
      'nav.lang': 'idioma',
      'index.welcome': 'hola',
      'index.tagline': 'ingeniero informático · desarrollador de juegos · investigador',
      'index.hint': 'haz clic en el agua — te escucha',
      'index.nav.about': 'sobre mí', 'index.nav.game': 'juegos', 'index.nav.code': 'código',
      'title.index': 'Muhammed Murad Chamaa',
      'about.title': 'Sobre mí — Muhammed Murad Chamaa',
      'about.heading': 'sobre mí',
      'about.sub': 'ingeniero informático · desarrollador de juegos · investigador',
      'about.sub2': 'normalmente por aquí, después del anochecer',
      'about.admin': 'para el admin: esta página lee',
      'about.admin2': 'para actualizarla',
      'about.note': 'si estás leyendo esto a las 3 de la mañana, somos el mismo tipo de persona — la compilación terminó o no, y de todos modos sigues aquí.',
      'about.caption': 'yo, fingiendo estar despierto',
      'about.blurb': 'Normalmente entre un error de compilación y otra taza de café. Si es de juegos, chips cuánticos o Linux, ya me interesa.',
      'about.nophoto': 'aún no hay foto',
      'about.nophoto2': '— añade una en _assets —',
      'game.title': 'Juegos e investigación — Muhammed Murad Chamaa',
      'game.heading': 'JUEGOS',
      'game.sub': 'máquina arcade al atardecer — la mesa de ping-pong tras las tarjetas nunca duerme',
      'game.research': 'INVESTIGACIÓN',
      'game.scroll': 'desplázate ↓ — la mesa sigue jugando sola',
      'game.artpending': 'arte pendiente',
      'code.title': 'Código — Muhammed Murad Chamaa',
      'code.heading': 'CÓDIGO',
      'code.sub': 'filas del currículum × el pequeño shell — conoce este repositorio',
      'code.placeholder': 'prueba: help',
      'code.select': 'Selecciona una entrada. O escribe',
      'code.select2': 'en la terminal — aquí sabe moverse.',
      'code.scrollcue': 'panel de descripción desplazable — las entradas largas se desplazan',
      'code.bar': 'murad@gazi:~/curriculum',
      'term.booting': 'iniciando . . . ok',
      'term.loading': 'cargando currículum . . . ok',
      'term.loggedin': 'usuario murad conectado',
      'term.help': 'comandos disponibles:',
      'term.help.ls': 'listar archivos',
      'term.help.cat': 'leer un archivo (p. ej. cat curriculum.txt)',
      'term.help.whoami': 'quién es este',
      'term.help.links': 'contacto / perfiles',
      'term.help.clear': 'limpiar la pantalla',
      'term.help.more': 'todo también está en las filas del currículum a la derecha →',
      'term.nosuchfile': 'no existe el archivo',
      'term.notfound': 'comando no encontrado (prueba'
    },
    fr: {
      'nav.main': 'ACCUEIL', 'nav.about': 'À PROPOS', 'nav.game': 'JEUX', 'nav.code': 'CODE',
      'nav.lang': 'langue',
      'index.welcome': 'bonjour',
      'index.tagline': 'ingénieur informatique · développeur de jeux · chercheur',
      'index.hint': "clique sur l'eau — elle t'entend",
      'index.nav.about': 'à propos', 'index.nav.game': 'jeux', 'index.nav.code': 'code',
      'title.index': 'Muhammed Murad Chamaa',
      'about.title': 'À propos — Muhammed Murad Chamaa',
      'about.heading': 'à propos',
      'about.sub': 'ingénieur informatique · développeur de jeux · chercheur',
      'about.sub2': 'souvent ici, après la tombée du jour',
      'about.admin': "pour l'admin : cette page lit",
      'about.admin2': 'pour la mettre à jour',
      'about.note': "si tu lis ça à 3 h du matin, on est du même genre — le build est fini ou pas, et tu es toujours là.",
      'about.caption': 'moi, faisant semblant d’être réveillé',
      'about.blurb': "Souvent entre une erreur de compilation et un café. Si c'est jeux, puces quantiques ou Linux, ça m'intéresse déjà.",
      'about.nophoto': 'pas encore de photo',
      'about.nophoto2': '— ajoute-la dans _assets —',
      'game.title': 'Jeux et recherche — Muhammed Murad Chamaa',
      'game.heading': 'JEUX',
      'game.sub': "borne d'arcade au crépuscule — la table de ping-pong derrière les cartes ne dort jamais",
      'game.research': 'RECHERCHE',
      'game.scroll': 'défile ↓ — la table continue de jouer toute seule',
      'game.artpending': 'image à venir',
      'code.title': 'Code — Muhammed Murad Chamaa',
      'code.heading': 'CODE',
      'code.sub': 'lignes de CV × le petit shell — il connaît ce dépôt',
      'code.placeholder': 'essaie : help',
      'code.select': 'Choisis une entrée. Ou tape',
      'code.select2': 'dans le terminal — il connaît le chemin.',
      'code.scrollcue': 'panneau descriptif défilant — les longues entrées défilent dans leur cadre',
      'code.bar': 'murad@gazi:~/cv',
      'term.booting': 'démarrage . . . ok',
      'term.loading': 'chargement du CV . . . ok',
      'term.loggedin': 'utilisateur murad connecté',
      'term.help': 'commandes disponibles :',
      'term.help.ls': 'lister les fichiers',
      'term.help.cat': 'lire un fichier (ex. cat cv.txt)',
      'term.help.whoami': "c'est qui ce type",
      'term.help.links': 'contact / profils',
      'term.help.clear': "effacer l'écran",
      'term.help.more': 'tout est aussi dans les lignes de CV à droite →',
      'term.nosuchfile': 'fichier introuvable',
      'term.notfound': 'commande introuvable (essaie'
    },
    ar: {
      'nav.main': 'الرئيسية', 'nav.about': 'نبذة', 'nav.game': 'ألعاب', 'nav.code': 'كود',
      'nav.lang': 'اللغة',
      'index.welcome': 'أهلاً',
      'index.tagline': 'مهندس حاسوب · مطوّر ألعاب · باحث',
      'index.hint': 'انقر على الماء — إنه يسمعك',
      'index.nav.about': 'نبذة عني', 'index.nav.game': 'ألعاب', 'index.nav.code': 'كود',
      'title.index': 'Muhammed Murad Chamaa',
      'about.title': 'نبذة عني — Muhammed Murad Chamaa',
      'about.heading': 'نبذة عني',
      'about.sub': 'مهندس حاسوب · مطوّر ألعاب · باحث',
      'about.sub2': 'عادةً هنا، بعد حلول الظلام',
      'about.admin': 'للمشرف: هذه الصفحة تقرأ',
      'about.admin2': 'لتحديثها شغّل',
      'about.note': 'إن كنت تقرأ هذا في الثالثة فجراً، فنحن من النوع نفسه — البناء انتهى أو لم ينتهِ، وأنت ما زلت هنا.',
      'about.caption': 'أنا، أتظاهر بأنني مستيقظ',
      'about.blurb': 'عادةً ما أكون بين خطأ في الترجمة وفنجان قهوة آخر. إن كان الأمر عن الألعاب أو الرقائق الكمية أو لينكس، فأنا مهتم سلفاً.',
      'about.nophoto': 'لا توجد صورة بعد',
      'about.nophoto2': '— أضف واحدة إلى _assets —',
      'game.title': 'ألعاب وأبحاث — Muhammed Murad Chamaa',
      'game.heading': 'ألعاب',
      'game.sub': 'آلة أركيد عند الغروب — طاولة كرة الطاولة خلف البطاقات لا تنام أبداً',
      'game.research': 'أبحاث',
      'game.scroll': 'مرّر للأسفل ↓ — الطاولة تستمر باللعب وحدها',
      'game.artpending': 'الصورة قيد الإعداد',
      'code.title': 'الكود — Muhammed Murad Chamaa',
      'code.heading': 'الكود',
      'code.sub': 'أسطر السيرة × الطرفية الصغيرة — تعرف طريقها في هذا المستودع',
      'code.placeholder': 'جرّب: help',
      'code.select': 'اختر سطراً. أو اكتب',
      'code.select2': 'في الطرفية — تعرف الطريق هنا.',
      'code.scrollcue': 'لوحة وصف قابلة للتمرير — الأسطر الطويلة تتمرر داخل صندوقها',
      'code.bar': 'murad@gazi:~/السيرة',
      'term.booting': 'جارٍ الإقلاع . . . تم',
      'term.loading': 'جارٍ تحميل السيرة . . . تم',
      'term.loggedin': 'المستخدم murad سجّل الدخول',
      'term.help': 'الأوامر المتاحة:',
      'term.help.ls': 'سرد الملفات',
      'term.help.cat': 'قراءة ملف (مثال: cat السيرة.txt)',
      'term.help.whoami': 'من هذا الشخص',
      'term.help.links': 'التواصل / الملفات الشخصية',
      'term.help.clear': 'مسح الشاشة',
      'term.help.more': 'كل شيء موجود أيضاً في أسطر السيرة على اليمين →',
      'term.nosuchfile': 'لا يوجد ملف بهذا الاسم',
      'term.notfound': 'الأمر غير موجود (جرّب'
    },
    bn: {
      'nav.main': 'প্রধান', 'nav.about': 'পরিচিতি', 'nav.game': 'গেম', 'nav.code': 'কোড',
      'nav.lang': 'ভাষা',
      'index.welcome': 'স্বাগতম',
      'index.tagline': 'কম্পিউটার প্রকৌশলী · গেম ডেভেলপার · গবেষক',
      'index.hint': 'পানিতে ক্লিক করুন — এটি শোনে',
      'index.nav.about': 'আমার সম্পর্কে', 'index.nav.game': 'গেম', 'index.nav.code': 'কোড',
      'title.index': 'Muhammed Murad Chamaa',
      'about.title': 'আমার সম্পর্কে — Muhammed Murad Chamaa',
      'about.heading': 'আমার সম্পর্কে',
      'about.sub': 'কম্পিউটার প্রকৌশলী · গেম ডেভেলপার · গবেষক',
      'about.sub2': 'সাধারণত এখানেই, রাত নামার পরে',
      'about.admin': 'অ্যাডমিনের জন্য: এই পাতা পড়ে',
      'about.admin2': 'হালনাগাদ করতে চালান',
      'about.note': 'রাত তিনটায় পড়লে বুঝবেন আমরা একই ধরনের মানুষ — বিল্ড শেষ হোক বা না হোক, আপনি এখনো এখানে।',
      'about.caption': 'আমি, জেগে আছি বলে অভিনয় করছি',
      'about.blurb': 'সাধারণত কম্পাইল এরর আর আরেক কাপ কফির মাঝখানে থাকি। গেম, কোয়ান্টাম চিপ বা লিনাক্স হলে আগ্রহ আগেই আছে।',
      'about.nophoto': 'এখনো ছবি নেই',
      'about.nophoto2': '— _assets-এ একটি যোগ করুন —',
      'game.title': 'গেম ও গবেষণা — Muhammed Murad Chamaa',
      'game.heading': 'গেম',
      'game.sub': 'সন্ধ্যার আর্কেড কেবিনেট — কার্ডের পিছনের পিং-পং টেবিল কখনো ঘুমায় না',
      'game.research': 'গবেষণা',
      'game.scroll': 'স্ক্রল ↓ — টেবিল নিজে নিজেই খেলতে থাকে',
      'game.artpending': 'ছবি বাকি',
      'code.title': 'কোড — Muhammed Murad Chamaa',
      'code.heading': 'কোড',
      'code.sub': 'রেজুমে সারি × ছোট শেল — এই রিপো চেনে',
      'code.placeholder': 'চেষ্টা করুন: help',
      'code.select': 'একটি সারি বাছুন। অথবা টার্মিনালে',
      'code.select2': 'লিখুন — এখানকার পথ চেনে।',
      'code.scrollcue': 'স্ক্রলযোগ্য বিবরণ প্যানেল — লম্বা সারি বাক্সের ভিতরে স্ক্রল হয়',
      'code.bar': 'murad@gazi:~/resume',
      'term.booting': 'বুট হচ্ছে . . . ঠিক',
      'term.loading': 'রেজুমে লোড হচ্ছে . . . ঠিক',
      'term.loggedin': 'ব্যবহারকারী murad প্রবেশ করেছেন',
      'term.help': 'উপলব্ধ কমান্ড:',
      'term.help.ls': 'ফাইল তালিকা',
      'term.help.cat': 'ফাইল পড়ুন (যেমন cat resume.txt)',
      'term.help.whoami': 'এই লোকটি কে',
      'term.help.links': 'যোগাযোগ / প্রোফাইল',
      'term.help.clear': 'স্ক্রিন পরিষ্কার করুন',
      'term.help.more': 'সবকিছু ডানদিকের রেজুমে সারিতেও আছে →',
      'term.nosuchfile': 'এমন ফাইল নেই',
      'term.notfound': 'কমান্ড পাওয়া যায়নি (চেষ্টা করুন'
    },
    ru: {
      'nav.main': 'ГЛАВНАЯ', 'nav.about': 'ОБО МНЕ', 'nav.game': 'ИГРЫ', 'nav.code': 'КОД',
      'nav.lang': 'язык',
      'index.welcome': 'привет',
      'index.tagline': 'инженер-программист · геймдизайнер · исследователь',
      'index.hint': 'нажми на воду — она слышит',
      'index.nav.about': 'обо мне', 'index.nav.game': 'игры', 'index.nav.code': 'код',
      'title.index': 'Muhammed Murad Chamaa',
      'about.title': 'Обо мне — Muhammed Murad Chamaa',
      'about.heading': 'обо мне',
      'about.sub': 'инженер-программист · геймдизайнер · исследователь',
      'about.sub2': 'обычно здесь, после наступления темноты',
      'about.admin': 'для админа: эта страница читает',
      'about.admin2': 'чтобы обновить',
      'about.note': 'если ты читаешь это в три ночи, мы одного поля ягоды — сборка завершилась или нет, а ты всё ещё здесь.',
      'about.caption': 'я, делаю вид, что не сплю',
      'about.blurb': 'Обычно меня можно найти между ошибкой компиляции и очередной чашкой кофе. Если речь об играх, квантовых чипах или Linux — мне уже интересно.',
      'about.nophoto': 'фото пока нет',
      'about.nophoto2': '— добавь его в _assets —',
      'game.title': 'Игры и исследования — Muhammed Murad Chamaa',
      'game.heading': 'ИГРЫ',
      'game.sub': 'аркадный автомат в сумерках — стол для пинг-понга за карточками никогда не спит',
      'game.research': 'ИССЛЕДОВАНИЯ',
      'game.scroll': 'прокрути ↓ — стол продолжает играть сам',
      'game.artpending': 'изображение готовится',
      'code.title': 'Код — Muhammed Murad Chamaa',
      'code.heading': 'КОД',
      'code.sub': 'строки резюме × маленькая оболочка — она знает этот репозиторий',
      'code.placeholder': 'попробуй: help',
      'code.select': 'Выбери строку. Или введи',
      'code.select2': 'в терминале — он здесь всё знает.',
      'code.scrollcue': 'прокручиваемая панель описания — длинные записи прокручиваются внутри',
      'code.bar': 'murad@gazi:~/резюме',
      'term.booting': 'загрузка . . . ок',
      'term.loading': 'загружаю резюме . . . ок',
      'term.loggedin': 'пользователь murad вошёл',
      'term.help': 'доступные команды:',
      'term.help.ls': 'список файлов',
      'term.help.cat': 'прочитать файл (напр. cat резюме.txt)',
      'term.help.whoami': 'кто это вообще',
      'term.help.links': 'контакты / профили',
      'term.help.clear': 'очистить экран',
      'term.help.more': 'всё это есть и в строках резюме справа →',
      'term.nosuchfile': 'нет такого файла',
      'term.notfound': 'команда не найдена (попробуй'
    },
    pt: {
      'nav.main': 'INÍCIO', 'nav.about': 'SOBRE', 'nav.game': 'JOGOS', 'nav.code': 'CÓDIGO',
      'nav.lang': 'idioma',
      'index.welcome': 'olá',
      'index.tagline': 'engenheiro de computação · desenvolvedor de jogos · pesquisador',
      'index.hint': 'clique na água — ela escuta',
      'index.nav.about': 'sobre mim', 'index.nav.game': 'jogos', 'index.nav.code': 'código',
      'title.index': 'Muhammed Murad Chamaa',
      'about.title': 'Sobre mim — Muhammed Murad Chamaa',
      'about.heading': 'sobre mim',
      'about.sub': 'engenheiro de computação · desenvolvedor de jogos · pesquisador',
      'about.sub2': 'normalmente por aqui, depois do anoitecer',
      'about.admin': 'para o admin: esta página lê',
      'about.admin2': 'para atualizá-la',
      'about.note': 'se você está lendo isto às 3 da manhã, somos o mesmo tipo de pessoa — o build terminou ou não, e você continua aqui.',
      'about.caption': 'eu, fingindo estar acordado',
      'about.blurb': 'Normalmente entre um erro de compilação e mais um café. Se for sobre jogos, chips quânticos ou Linux, já me interesso.',
      'about.nophoto': 'ainda sem foto',
      'about.nophoto2': '— adicione uma em _assets —',
      'game.title': 'Jogos e pesquisa — Muhammed Murad Chamaa',
      'game.heading': 'JOGOS',
      'game.sub': 'fliperama ao anoitecer — a mesa de ping-pong atrás dos cartões nunca dorme',
      'game.research': 'PESQUISA',
      'game.scroll': 'role ↓ — a mesa continua jogando sozinha',
      'game.artpending': 'arte pendente',
      'code.title': 'Código — Muhammed Murad Chamaa',
      'code.heading': 'CÓDIGO',
      'code.sub': 'linhas do currículo × o pequeno shell — ele conhece este repositório',
      'code.placeholder': 'tente: help',
      'code.select': 'Escolha uma entrada. Ou digite',
      'code.select2': 'no terminal — ele conhece o caminho.',
      'code.scrollcue': 'painel de descrição rolável — entradas longas rolam dentro da caixa',
      'code.bar': 'murad@gazi:~/curriculo',
      'term.booting': 'iniciando . . . ok',
      'term.loading': 'carregando currículo . . . ok',
      'term.loggedin': 'usuário murad conectado',
      'term.help': 'comandos disponíveis:',
      'term.help.ls': 'listar arquivos',
      'term.help.cat': 'ler um arquivo (ex. cat curriculo.txt)',
      'term.help.whoami': 'quem é esse cara',
      'term.help.links': 'contato / perfis',
      'term.help.clear': 'limpar a tela',
      'term.help.more': 'tudo também está nas linhas do currículo à direita →',
      'term.nosuchfile': 'arquivo não encontrado',
      'term.notfound': 'comando não encontrado (tente'
    },
    id: {
      'nav.main': 'UTAMA', 'nav.about': 'TENTANG', 'nav.game': 'GAME', 'nav.code': 'KODE',
      'nav.lang': 'bahasa',
      'index.welcome': 'halo',
      'index.tagline': 'insinyur komputer · pengembang game · peneliti',
      'index.hint': 'klik airnya — ia mendengar',
      'index.nav.about': 'tentang saya', 'index.nav.game': 'game', 'index.nav.code': 'kode',
      'title.index': 'Muhammed Murad Chamaa',
      'about.title': 'Tentang Saya — Muhammed Murad Chamaa',
      'about.heading': 'tentang saya',
      'about.sub': 'insinyur komputer · pengembang game · peneliti',
      'about.sub2': 'biasanya di sini, setelah gelap',
      'about.admin': 'untuk admin: halaman ini membaca',
      'about.admin2': 'untuk memperbaruinya',
      'about.note': 'kalau kamu membaca ini jam 3 pagi, kita orang yang sama — build-nya selesai atau belum, dan kamu masih di sini.',
      'about.caption': 'aku, pura-pura masih bangun',
      'about.blurb': 'Biasanya ada di antara error kompilasi dan isi ulang kopi. Kalau soal game, chip kuantum, atau Linux, aku sudah tertarik.',
      'about.nophoto': 'belum ada foto',
      'about.nophoto2': '— tambahkan ke _assets —',
      'game.title': 'Game & Riset — Muhammed Murad Chamaa',
      'game.heading': 'GAME',
      'game.sub': 'mesin arkade saat senja — meja ping-pong di balik kartu tidak pernah tidur',
      'game.research': 'RISET',
      'game.scroll': 'gulir ↓ — mejanya terus bermain sendiri',
      'game.artpending': 'gambar menyusul',
      'code.title': 'Kode — Muhammed Murad Chamaa',
      'code.heading': 'KODE',
      'code.sub': 'baris resume × shell kecil — ia tahu seluk-beluk repo ini',
      'code.placeholder': 'coba: help',
      'code.select': 'Pilih satu entri. Atau ketik',
      'code.select2': 'di terminal — ia tahu jalannya.',
      'code.scrollcue': 'panel deskripsi yang bisa digulir — entri panjang menggulir di dalam kotak',
      'code.bar': 'murad@gazi:~/resume',
      'term.booting': 'memulai . . . ok',
      'term.loading': 'memuat resume . . . ok',
      'term.loggedin': 'pengguna murad masuk',
      'term.help': 'perintah tersedia:',
      'term.help.ls': 'daftar berkas',
      'term.help.cat': 'baca berkas (mis. cat resume.txt)',
      'term.help.whoami': 'siapa orang ini',
      'term.help.links': 'kontak / profil',
      'term.help.clear': 'bersihkan layar',
      'term.help.more': 'semuanya juga ada di baris resume di kanan →',
      'term.nosuchfile': 'berkas tidak ditemukan',
      'term.notfound': 'perintah tidak ditemukan (coba'
    },
    de: {
      'nav.main': 'START', 'nav.about': 'ÜBER MICH', 'nav.game': 'SPIELE', 'nav.code': 'CODE',
      'nav.lang': 'Sprache',
      'index.welcome': 'hallo',
      'index.tagline': 'Informatikingenieur · Spieleentwickler · Forscher',
      'index.hint': 'klick aufs Wasser — es hört dich',
      'index.nav.about': 'über mich', 'index.nav.game': 'spiele', 'index.nav.code': 'code',
      'title.index': 'Muhammed Murad Chamaa',
      'about.title': 'Über mich — Muhammed Murad Chamaa',
      'about.heading': 'über mich',
      'about.sub': 'Informatikingenieur · Spieleentwickler · Forscher',
      'about.sub2': 'meist hier, nach Einbruch der Dunkelheit',
      'about.admin': 'für den Admin: diese Seite liest',
      'about.admin2': 'zum Aktualisieren',
      'about.note': 'wenn du das um 3 Uhr nachts liest, sind wir derselbe Typ Mensch — der Build ist fertig oder nicht, und du bist immer noch hier.',
      'about.caption': 'ich, tue so als wäre ich wach',
      'about.blurb': 'Meist zwischen einem Compilerfehler und dem nächsten Kaffee zu finden. Bei Spielen, Quantenchips oder Linux bin ich sofort dabei.',
      'about.nophoto': 'noch kein Foto',
      'about.nophoto2': '— eins in _assets ablegen —',
      'game.title': 'Spiele & Forschung — Muhammed Murad Chamaa',
      'game.heading': 'SPIELE',
      'game.sub': 'Spielhalle in der Dämmerung — der Tischtennistisch hinter den Karten schläft nie',
      'game.research': 'FORSCHUNG',
      'game.scroll': 'scrollen ↓ — der Tisch spielt von allein weiter',
      'game.artpending': 'Bild folgt',
      'code.title': 'Code — Muhammed Murad Chamaa',
      'code.heading': 'CODE',
      'code.sub': 'Lebenslauf-Zeilen × die kleine Shell — kennt sich hier aus',
      'code.placeholder': 'versuch: help',
      'code.select': 'Wähle einen Eintrag. Oder tippe',
      'code.select2': 'ins Terminal — hier kennt er sich aus.',
      'code.scrollcue': 'scrollbares Beschreibungsfeld — lange Einträge scrollen im Kasten',
      'code.bar': 'murad@gazi:~/lebenslauf',
      'term.booting': 'starte . . . ok',
      'term.loading': 'lade Lebenslauf . . . ok',
      'term.loggedin': 'Benutzer murad angemeldet',
      'term.help': 'verfügbare Befehle:',
      'term.help.ls': 'Dateien auflisten',
      'term.help.cat': 'Datei lesen (z. B. cat lebenslauf.txt)',
      'term.help.whoami': 'wer ist das',
      'term.help.links': 'Kontakt / Profile',
      'term.help.clear': 'Bildschirm leeren',
      'term.help.more': 'alles steht auch in den Lebenslauf-Zeilen rechts →',
      'term.nosuchfile': 'Datei nicht gefunden',
      'term.notfound': 'Befehl nicht gefunden (versuch'
    },
    ja: {
      'nav.main': 'ホーム', 'nav.about': '私について', 'nav.game': 'ゲーム', 'nav.code': 'コード',
      'nav.lang': '言語',
      'index.welcome': 'ようこそ',
      'index.tagline': 'コンピュータエンジニア · ゲーム開発者 · 研究者',
      'index.hint': '水面をクリック — 聞こえています',
      'index.nav.about': '私について', 'index.nav.game': 'ゲーム', 'index.nav.code': 'コード',
      'title.index': 'Muhammed Murad Chamaa',
      'about.title': '私について — Muhammed Murad Chamaa',
      'about.heading': '私について',
      'about.sub': 'コンピュータエンジニア · ゲーム開発者 · 研究者',
      'about.sub2': 'たいていここに、日が暮れてから',
      'about.admin': '管理者向け：このページは',
      'about.admin2': 'を読みます。更新するには',
      'about.note': 'これを午前3時に読んでいるなら、私たちは同じ種類の人間です — ビルドが終わっていてもいなくても、あなたはまだここにいる。',
      'about.caption': '起きているふりをしている私',
      'about.blurb': 'たいていコンパイルエラーとコーヒーのおかわりの間にいます。ゲーム、量子チップ、Linux の話ならもう興味があります。',
      'about.nophoto': '写真はまだありません',
      'about.nophoto2': '— _assets に追加してください —',
      'game.title': 'ゲームと研究 — Muhammed Murad Chamaa',
      'game.heading': 'ゲーム',
      'game.sub': '夕暮れのアーケード筐体 — カードの後ろの卓球台は決して眠らない',
      'game.research': '研究',
      'game.scroll': 'スクロール ↓ — 台はひとりで打ち続ける',
      'game.artpending': '画像準備中',
      'code.title': 'コード — Muhammed Murad Chamaa',
      'code.heading': 'コード',
      'code.sub': '経歴の行 × 小さなシェル — このリポジトリを知っている',
      'code.placeholder': '試す: help',
      'code.select': '項目を選ぶか、ターミナルに',
      'code.select2': 'と入力 — ここは道を知っています。',
      'code.scrollcue': 'スクロールできる説明パネル — 長い項目は枠内でスクロールします',
      'code.bar': 'murad@gazi:~/経歴',
      'term.booting': '起動中 . . . ok',
      'term.loading': '経歴を読み込み中 . . . ok',
      'term.loggedin': 'ユーザー murad がログインしました',
      'term.help': '使用できるコマンド:',
      'term.help.ls': 'ファイル一覧',
      'term.help.cat': 'ファイルを読む（例: cat 経歴.txt）',
      'term.help.whoami': 'この人は誰',
      'term.help.links': '連絡先 / プロフィール',
      'term.help.clear': '画面を消す',
      'term.help.more': 'すべて右側の経歴の行にもあります →',
      'term.nosuchfile': 'そのファイルはありません',
      'term.notfound': 'コマンドが見つかりません（試す'
    },
    ko: {
      'nav.main': '메인', 'nav.about': '소개', 'nav.game': '게임', 'nav.code': '코드',
      'nav.lang': '언어',
      'index.welcome': '환영합니다',
      'index.tagline': '컴퓨터 엔지니어 · 게임 개발자 · 연구자',
      'index.hint': '물을 클릭하세요 — 듣고 있어요',
      'index.nav.about': '소개', 'index.nav.game': '게임', 'index.nav.code': '코드',
      'title.index': 'Muhammed Murad Chamaa',
      'about.title': '소개 — Muhammed Murad Chamaa',
      'about.heading': '소개',
      'about.sub': '컴퓨터 엔지니어 · 게임 개발자 · 연구자',
      'about.sub2': '보통 여기, 해가 진 뒤에',
      'about.admin': '관리자용: 이 페이지는',
      'about.admin2': '를 읽습니다. 갱신하려면',
      'about.note': '새벽 3시에 이걸 읽고 있다면 우리는 같은 부류입니다 — 빌드가 끝났든 아니든, 당신은 아직 여기 있으니까.',
      'about.caption': '깨어 있는 척하는 나',
      'about.blurb': '보통 컴파일 오류와 커피 리필 사이에 있습니다. 게임, 양자 칩, 리눅스라면 이미 관심 있습니다.',
      'about.nophoto': '아직 사진이 없습니다',
      'about.nophoto2': '— _assets 에 추가하세요 —',
      'game.title': '게임과 연구 — Muhammed Murad Chamaa',
      'game.heading': '게임',
      'game.sub': '해질녘의 아케이드 캐비닛 — 카드 뒤의 탁구대는 결코 잠들지 않습니다',
      'game.research': '연구',
      'game.scroll': '스크롤 ↓ — 탁구대는 스스로 계속 칩니다',
      'game.artpending': '이미지 준비 중',
      'code.title': '코드 — Muhammed Murad Chamaa',
      'code.heading': '코드',
      'code.sub': '이력서 행 × 작은 셸 — 이 저장소를 잘 압니다',
      'code.placeholder': '시도: help',
      'code.select': '항목을 선택하거나 터미널에',
      'code.select2': '입력하세요 — 여기 길을 압니다.',
      'code.scrollcue': '스크롤 가능한 설명 패널 — 긴 항목은 상자 안에서 스크롤됩니다',
      'code.bar': 'murad@gazi:~/이력서',
      'term.booting': '부팅 중 . . . 완료',
      'term.loading': '이력서 불러오는 중 . . . 완료',
      'term.loggedin': '사용자 murad 로그인',
      'term.help': '사용 가능한 명령:',
      'term.help.ls': '파일 목록',
      'term.help.cat': '파일 읽기 (예: cat 이력서.txt)',
      'term.help.whoami': '이 사람은 누구',
      'term.help.links': '연락처 / 프로필',
      'term.help.clear': '화면 지우기',
      'term.help.more': '모든 내용은 오른쪽 이력서 행에도 있습니다 →',
      'term.nosuchfile': '그런 파일이 없습니다',
      'term.notfound': '명령을 찾을 수 없습니다 (시도'
    },
    it: {
      'nav.main': 'HOME', 'nav.about': 'CHI SONO', 'nav.game': 'GIOCHI', 'nav.code': 'CODICE',
      'nav.lang': 'lingua',
      'index.welcome': 'ciao',
      'index.tagline': 'ingegnere informatico · sviluppatore di giochi · ricercatore',
      'index.hint': "clicca sull'acqua — ti sente",
      'index.nav.about': 'chi sono', 'index.nav.game': 'giochi', 'index.nav.code': 'codice',
      'title.index': 'Muhammed Murad Chamaa',
      'about.title': 'Chi sono — Muhammed Murad Chamaa',
      'about.heading': 'chi sono',
      'about.sub': 'ingegnere informatico · sviluppatore di giochi · ricercatore',
      'about.sub2': 'di solito qui, dopo il tramonto',
      'about.admin': "per l'admin: questa pagina legge",
      'about.admin2': 'per aggiornarla',
      'about.note': 'se stai leggendo questo alle 3 di notte, siamo lo stesso tipo di persona — la build è finita o no, e tu sei ancora qui.',
      'about.caption': 'io, che fingo di essere sveglio',
      'about.blurb': 'Di solito tra un errore di compilazione e un caffè. Se si parla di giochi, chip quantistici o Linux, mi interessa già.',
      'about.nophoto': 'ancora nessuna foto',
      'about.nophoto2': '— aggiungine una in _assets —',
      'game.title': 'Giochi e ricerca — Muhammed Murad Chamaa',
      'game.heading': 'GIOCHI',
      'game.sub': 'cabinato arcade al crepuscolo — il tavolo da ping-pong dietro le schede non dorme mai',
      'game.research': 'RICERCA',
      'game.scroll': 'scorri ↓ — il tavolo continua a giocare da solo',
      'game.artpending': 'immagine in arrivo',
      'code.title': 'Codice — Muhammed Murad Chamaa',
      'code.heading': 'CODICE',
      'code.sub': 'righe del curriculum × la piccola shell — conosce questo repository',
      'code.placeholder': 'prova: help',
      'code.select': 'Scegli una voce. Oppure digita',
      'code.select2': 'nel terminale — qui sa come muoversi.',
      'code.scrollcue': 'pannello descrittivo scorrevole — le voci lunghe scorrono nel riquadro',
      'code.bar': 'murad@gazi:~/curriculum',
      'term.booting': 'avvio . . . ok',
      'term.loading': 'carico il curriculum . . . ok',
      'term.loggedin': 'utente murad connesso',
      'term.help': 'comandi disponibili:',
      'term.help.ls': 'elenca i file',
      'term.help.cat': 'leggi un file (es. cat curriculum.txt)',
      'term.help.whoami': 'chi è questo tizio',
      'term.help.links': 'contatti / profili',
      'term.help.clear': 'pulisci lo schermo',
      'term.help.more': 'tutto è anche nelle righe del curriculum a destra →',
      'term.nosuchfile': 'file inesistente',
      'term.notfound': 'comando non trovato (prova'
    }
  };/*LANGEND*/

  /* ── runtime ─────────────────────────────────────────────────────── */
  const LS_KEY = 'mmc-lang';

  function detect() {
    let forced = null;
    try { forced = new URLSearchParams(location.search).get('lang'); } catch (e) {}
    if (forced && S[forced]) return forced;
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved && S[saved]) return saved;
    } catch (e) {}
    // navigator.languages, longest-prefix match (e.g. pt-BR → pt, zh-Hant → zh)
    const nav = navigator.languages && navigator.languages.length
      ? navigator.languages : [navigator.language || 'en'];
    for (const tag of nav) {
      const low = String(tag).toLowerCase();
      if (S[low]) return low;
      const base = low.split('-')[0];
      if (S[base]) return base;
    }
    return 'en';
  }

  let lang = detect();

  function t(key) {
    const pack = S[lang] || S.en;
    return (pack && pack[key] !== undefined) ? pack[key] : (S.en[key] !== undefined ? S.en[key] : key);
  }

  /* translated INFO.md content, when data.js provides it */
  function content() {
    const D = window.SITE_DATA || {};
    const T = D.translations || {};
    return T[lang] || null;
  }

  function apply(root) {
    const scope = root || document;

    scope.querySelectorAll('[data-i18n]').forEach(el => {
      const v = t(el.getAttribute('data-i18n'));
      if (v !== undefined) el.textContent = v;
    });

    scope.querySelectorAll('[data-i18n-attr]').forEach(el => {
      el.getAttribute('data-i18n-attr').split(';').forEach(pair => {
        const i = pair.indexOf(':');
        if (i < 1) return;
        const attr = pair.slice(0, i).trim(), key = pair.slice(i + 1).trim();
        el.setAttribute(attr, t(key));
      });
    });

    const title = scope.querySelector ? scope.querySelector('title[data-i18n]') : null;
    if (title) document.title = t(title.getAttribute('data-i18n'));

    document.documentElement.lang = lang;
    document.documentElement.dir = RTL[lang] ? 'rtl' : 'ltr';

    // let page scripts re-render anything that builds strings itself
    document.dispatchEvent(new CustomEvent('mmc:lang', { detail: { lang: lang, t: t, content: content() } }));
  }

  function setLang(next) {
    if (!S[next]) return;
    lang = next;
    try { localStorage.setItem(LS_KEY, next); } catch (e) {}
    apply();
    syncSelect();
  }

  /* ── language selector in the nav ───────────────────────────────── */
  function syncSelect() {
    const sel = document.getElementById('lang-select');
    if (sel) sel.value = lang;
  }

  function injectSelect() {
    if (document.getElementById('lang-select')) return;

    // index.html has no nav bar, so the picker floats in the corner there
    const host = document.querySelector('.site-nav');
    if (!host) {
      const float = document.createElement('div');
      float.className = 'lang-float';
      document.body.appendChild(float);
      buildPicker(float);
      return;
    }
    buildPicker(host);
  }

  function buildPicker(nav) {

    const wrap = document.createElement('label');
    wrap.className = 'lang-picker';
    wrap.setAttribute('title', t('nav.lang'));

    const globe = document.createElement('span');
    globe.className = 'lang-globe';
    globe.setAttribute('aria-hidden', 'true');
    globe.textContent = '\u25C7';                 // small diamond, fits the pixel look

    const sel = document.createElement('select');
    sel.id = 'lang-select';
    sel.setAttribute('aria-label', t('nav.lang'));
    for (const [code, name] of LANGS) {
      const o = document.createElement('option');
      o.value = code; o.textContent = name;
      sel.appendChild(o);
    }
    sel.value = lang;
    sel.addEventListener('change', () => setLang(sel.value));

    wrap.appendChild(globe);
    wrap.appendChild(sel);
    nav.appendChild(wrap);
  }

  function boot() {
    injectSelect();
    apply();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.MMC_I18N = {
    langs: LANGS,
    strings: S,
    rtl: RTL,
    t: t,
    apply: apply,
    set: setLang,
    content: content,
    get lang() { return lang; }
  };
})();
