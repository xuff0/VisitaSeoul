// Catálogo de compras para llevar a Bolivia, transcrito de la guía de septiembre de 2026.
//
// Dos decisiones que vale la pena explicar:
//
// 1. Cada precio lleva su nivel de confianza. La guía distingue lo verificado en tienda de lo
//    estimado a partir del múltiplo observado. Aplanar esa diferencia sería mentir sobre cuánta
//    plata podés ahorrar, así que `confKr` y `confBo` viajan hasta la interfaz.
//
// 2. Los precios de Olive Young cambian todas las semanas por las promociones. Por eso existe
//    `SOURCE_DATE`, y por eso la app deja anotar el precio que viste en la góndola: el catálogo
//    es el punto de partida, no la última palabra.

export type Confidence = "verificado" | "estimado";

/** Aviso de voltaje para lo que se enchufa. Las zonas de 115V de La Paz son el problema. */
export type VoltFlag = "ok" | "revisar" | "riesgo";

export type ShoppingCategory = { id: string; label: string; icon: string };

export type Product = {
  id: string;
  name: string;
  /** Para mostrarle al vendedor y para buscar en Naver Shopping. */
  nameKo: string;
  cat: string;
  /** Rango de precio en Corea, en won. Ausente cuando la guía dice solo "variable". */
  krwMin?: number;
  krwMax?: number;
  /** Rango de precio en Bolivia, en bolivianos. Ausente cuando allá no se consigue. */
  bobMin?: number;
  bobMax?: number;
  confKr: Confidence;
  confBo?: Confidence;
  note?: string;
  /** Promoción típica ("1+1", "10+10") y el precio real por unidad aprovechándola. */
  promo?: string;
  promoUnitKrw?: number;
  volt?: VoltFlag;
  /** Peso aproximado por unidad, en gramos: la franquicia se llena antes que la maleta. */
  weightG?: number;
};

/** Fecha de los precios de la guía. Se muestra siempre, para que no los tomes como eternos. */
export const SOURCE_DATE = "2026-09-08";

export type Rates = {
  /** Won por dólar. */
  usdKrw: number;
  /** Bolivianos por dólar, tipo oficial. */
  usdBobOficial: number;
  /** Bolivianos por dólar, mercado paralelo. */
  usdBobParalelo: number;
};

// Bolivia ya no está en Bs 6,96: con la flexibilización cambiaria el oficial subió a ~12,26 y la
// brecha con el paralelo casi desapareció. Bs 12,3 por dólar es la referencia realista.
export const DEFAULT_RATES: Rates = {
  usdKrw: 1350,
  usdBobOficial: 12.26,
  usdBobParalelo: 12.39,
};

/** Régimen de viajeros de la aduana boliviana, en dólares FOB. */
export const CUSTOMS = {
  /** Hasta acá, artículos nuevos de uso personal entran sin pagar tributos. */
  franquiciaUsd: 1000,
  /** Entre la franquicia y este monto: despacho de menor cuantía, sin despachante. */
  menorCuantiaUsd: 2000,
  notes: [
    "La franquicia es individual e intransferible: si viajan dos, son $2.000 combinados.",
    "Aplica si volviste al país después de 90 días o más desde tu último ingreso con franquicia.",
    "Ropa usada, efectos personales usados y libros no cuentan contra la franquicia.",
    "Se llena el Formulario 250, la declaración jurada de equipaje. Hacelo en la app AN Viajero antes de aterrizar, no en la fila.",
    "Guardá todos los recibos: si aduana pregunta el valor, un recibo coreano vale más que tu palabra.",
    "Declará de más antes que de menos. Pagar tributos por un excedente de $200 no se parece en nada a que te decomisen todo.",
  ],
};

/** Devolución de IVA en Corea. Las reglas cambiaron en 2026. */
export const TAX_REFUND = {
  /** Compra mínima por recibo para que aplique. Bajó desde ₩30.000. */
  minKrw: 15000,
  /** Tope de devolución inmediata en caja, por transacción. */
  immediateMaxKrw: 1000000,
  /** Tope de devolución inmediata para todo el viaje. */
  tripMaxKrw: 5000000,
  /** Lo que realmente recibís: el IVA es 10%, menos la comisión del operador. */
  effectiveRate: [0.05, 0.08] as const,
  notes: [
    "Pedí siempre el descuento inmediato en caja, mostrando el pasaporte.",
    "Si un recibo pasa de ₩1.000.000 te dan voucher: se cobra en los kioscos del centro o en Incheon, antes de migración.",
    "Sin pasaporte encima no hay descuento. Llevalo siempre.",
    "Desde el 1 de enero de 2026 ya no hay devolución por procedimientos médicos o estéticos.",
    "Tenés 3 meses para sacar la mercadería del país.",
  ],
};

/** Corea es 220V/60Hz. Bolivia es 220–230V/50Hz, salvo zonas de La Paz y Viacha que son 115V. */
export const ELECTRICITY = {
  safe: "Cargadores, laptops y teléfonos: si dice 100–240V, 50/60Hz, no hay problema.",
  risk:
    "Electrodomésticos con motor o resistencia (secadores, arroceras, licuadoras) son 220V/60Hz. " +
    "En una toma de 115V de La Paz no arrancan, y a 50 Hz los motores giran lento y se calientan.",
  plug: "El enchufe coreano tipo C entra directo en Bolivia.",
};

/** Reparto sugerido de la guía para maximizar dentro de la franquicia de $1.000. */
export const BUDGET_PLAN: { cat: string; label: string; usd: number; what: string }[] = [
  { cat: "skincare", label: "K-beauty (cuidado de la piel)", usd: 250, what: "8–12 productos aprovechando 1+1. En Bolivia valdrían unos $600" },
  { cat: "mascarillas", label: "Mascarillas", usd: 60, what: "120–150 unidades. Valen unos $350 en Bolivia" },
  { cat: "opticas", label: "Lentes con receta", usd: 100, what: "2 pares completos, más cambio de cristales en tu marco actual" },
  { cat: "ginseng", label: "Ginseng rojo", usd: 80, what: "1 caja de Everytime de 30 sobres" },
  { cat: "ropa", label: "Ropa y outdoor", usd: 200, what: "1 campera de pluma más básicos en Goto Mall" },
  { cat: "comida", label: "Comida y snacks", usd: 60, what: "Regalos para unas 15 personas" },
  { cat: "electronica", label: "Electrónica y accesorios", usd: 150, what: "Teclado mecánico o periféricos, más cables de Daiso" },
  { cat: "regalos", label: "Cocina, papelería y regalos", usd: 80, what: "Cubiertos, plancha, artesanía de Insadong" },
];

export const SHOPPING_CATEGORIES: ShoppingCategory[] = [
  { id: "skincare", label: "Cuidado de la piel", icon: "🧴" },
  { id: "mascarillas", label: "Mascarillas", icon: "🎭" },
  { id: "maquillaje", label: "Maquillaje", icon: "💄" },
  { id: "dispositivos", label: "Dispositivos de belleza", icon: "⚡" },
  { id: "opticas", label: "Lentes con receta", icon: "👓" },
  { id: "ropa", label: "Ropa y outdoor", icon: "👕" },
  { id: "electronica", label: "Electrónica", icon: "🔌" },
  { id: "ginseng", label: "Ginseng rojo", icon: "🌿" },
  { id: "comida", label: "Comida y snacks", icon: "🍜" },
  { id: "cocina", label: "Cocina y hogar", icon: "🥄" },
  { id: "regalos", label: "Papelería y regalos", icon: "🎁" },
];

export const PRODUCTS: Product[] = [
  {"id": "boj-sun", "name": "Beauty of Joseon Relief Sun SPF50+ 50ml", "nameKo": "조선미녀 릴리프썬", "cat": "skincare", "krwMin": 12000, "krwMax": 18000, "bobMin": 259, "bobMax": 288, "confKr": "estimado", "confBo": "verificado", "note": "El protector solar más buscado del mundo. En promoción 1+1 la unidad baja a unos ₩7.500 ($5,5) contra Bs 259 en Bolivia: ahí el multiplicador real se va a 4x.", "promo": "1+1", "promoUnitKrw": 7500, "weightG": 60},
  {"id": "boj-glow", "name": "Beauty of Joseon Glow Serum (propóleo + niacinamida)", "nameKo": "조선미녀 글로우 세럼", "cat": "skincare", "krwMin": 10000, "krwMax": 10000, "bobMin": 251, "bobMax": 278, "confKr": "verificado", "confBo": "verificado", "note": "El mejor arbitraje medido de la marca: 2,9x. Precio coreano verificado en tienda.", "weightG": 70},
  {"id": "boj-revive", "name": "Beauty of Joseon Revive Serum (ginseng + caracol)", "nameKo": "조선미녀 리바이브 세럼", "cat": "skincare", "krwMin": 20000, "krwMax": 20000, "bobMin": 251, "bobMax": 278, "confKr": "estimado", "confBo": "verificado", "weightG": 70},
  {"id": "boj-dynasty", "name": "Beauty of Joseon Dynasty Cream", "nameKo": "조선미녀 다이너스티 크림", "cat": "skincare", "krwMin": 25000, "krwMax": 25000, "bobMin": 314, "bobMax": 348, "confKr": "estimado", "confBo": "verificado", "weightG": 90},
  {"id": "boj-eye", "name": "Beauty of Joseon, contorno de ojos", "nameKo": "조선미녀 아이크림", "cat": "skincare", "krwMin": 18000, "krwMax": 18000, "bobMin": 251, "bobMax": 278, "confKr": "estimado", "confBo": "verificado", "weightG": 40},
  {"id": "boj-cleanser", "name": "Beauty of Joseon, limpiador Green Plum", "nameKo": "조선미녀 그린플럼 클렌징 오일", "cat": "skincare", "krwMin": 14000, "krwMax": 14000, "bobMin": 224, "bobMax": 248, "confKr": "estimado", "confBo": "verificado", "weightG": 160},
  {"id": "roundlab-birch", "name": "Round Lab Birch Juice, protector solar", "nameKo": "라운드랩 자작나무 수분 선크림", "cat": "skincare", "krwMin": 17000, "krwMax": 20000, "bobMin": 280, "bobMax": 330, "confKr": "estimado", "confBo": "estimado", "note": "Número uno en los premios de Olive Young cuatro años seguidos.", "weightG": 60},
  {"id": "anua-toner", "name": "Anua Heartleaf 77% Toner 250ml", "nameKo": "아누아 어성초 77 토너", "cat": "skincare", "krwMin": 15000, "krwMax": 15000, "bobMin": 280, "bobMax": 350, "confKr": "verificado", "confBo": "estimado", "note": "Calmante. El más vendido para piel con acné.", "weightG": 290},
  {"id": "cosrx-snail", "name": "COSRX Snail 96 Mucin Essence", "nameKo": "코스알엑스 스네일 96 뮤신 에센스", "cat": "skincare", "krwMin": 12000, "krwMax": 12000, "bobMin": 250, "bobMax": 300, "confKr": "verificado", "confBo": "estimado", "note": "La esencia más vendida de Corea.", "weightG": 130},
  {"id": "torriden-serum", "name": "Torriden DIVE-IN Serum (hialurónico de bajo peso molecular)", "nameKo": "토리든 다이브인 세럼", "cat": "skincare", "krwMin": 13000, "krwMax": 13000, "bobMin": 260, "bobMax": 320, "confKr": "verificado", "confBo": "estimado", "weightG": 70},
  {"id": "illiyoon-cream", "name": "Illiyoon Ceramide Ato Cream, tubo grande", "nameKo": "일리윤 세라마이드 아토 집중크림", "cat": "skincare", "krwMin": 15000, "krwMax": 15000, "bobMin": 250, "bobMax": 300, "confKr": "verificado", "confBo": "estimado", "note": "La mejor relación precio/volumen para piel sensible.", "weightG": 220},
  {"id": "skin1004-ampoule", "name": "SKIN1004 Madagascar Centella Ampoule", "nameKo": "스킨1004 마다가스카르 센텔라 앰플", "cat": "skincare", "krwMin": 18000, "krwMax": 22000, "bobMin": 300, "bobMax": 380, "confKr": "estimado", "confBo": "estimado", "weightG": 110},
  {"id": "vt-reedle", "name": "VT Reedle Shot 100", "nameKo": "브이티 리들샷 100", "cat": "skincare", "krwMin": 30000, "krwMax": 40000, "bobMin": 500, "bobMax": 700, "confKr": "estimado", "confBo": "estimado", "note": "La ampolla de microagujas viral de 2026.", "weightG": 60},
  {"id": "medicube-pdrn", "name": "Medicube PDRN Pink Peptide Ampoule", "nameKo": "메디큐브 PDRN 핑크 펩타이드 앰플", "cat": "skincare", "krwMin": 35000, "krwMax": 45000, "bobMin": 600, "bobMax": 850, "confKr": "estimado", "confBo": "estimado", "note": "Número uno en ampolla aclarante en Olive Young.", "weightG": 60},
  {"id": "drg-red", "name": "Dr.G Red Blemish Clear Soothing Cream", "nameKo": "닥터지 레드 블레미쉬 크림", "cat": "skincare", "krwMin": 25000, "krwMax": 30000, "bobMin": 400, "bobMax": 550, "confKr": "estimado", "confBo": "estimado", "note": "El clásico para piel sensible y rojeces.", "weightG": 90},
  {"id": "mediheal-mask", "name": "Mediheal, mascarilla en tela (unidad)", "nameKo": "메디힐 마스크팩", "cat": "mascarillas", "krwMin": 1000, "krwMax": 1500, "bobMin": 25, "bobMax": 45, "confKr": "verificado", "confBo": "verificado", "note": "Buscá las promos 10+10: comprás diez y te dan veinte, así que la unidad sale ~₩500 ($0,37). Comprás a $0,40 y en Bolivia se venden a $2,50. Es el ítem de mayor margen de toda la guía.", "promo": "10+10", "promoUnitKrw": 500, "weightG": 20},
  {"id": "biodance-mask", "name": "Biodance Collagen Real Deep Mask (unidad)", "nameKo": "바이오던스 콜라겐 리얼딥 마스크", "cat": "mascarillas", "krwMin": 3000, "krwMax": 4000, "bobMin": 60, "bobMax": 90, "confKr": "estimado", "confBo": "estimado", "note": "La mascarilla de hidrogel que no se despega ni se resbala. La más pedida por turistas en 2026.", "weightG": 30},
  {"id": "torriden-mask", "name": "Torriden DIVE-IN Mask (unidad)", "nameKo": "토리든 다이브인 마스크", "cat": "mascarillas", "krwMin": 1500, "krwMax": 1500, "bobMin": 30, "bobMax": 50, "confKr": "estimado", "confBo": "estimado", "weightG": 20},
  {"id": "tirtir-cushion", "name": "TIRTIR Mask Fit Red Cushion", "nameKo": "티르티르 마스크핏 레드쿠션", "cat": "maquillaje", "krwMin": 25000, "krwMax": 30000, "bobMin": 400, "bobMax": 550, "confKr": "estimado", "confBo": "estimado", "note": "El cushion que reventó globalmente.", "weightG": 80},
  {"id": "romnd-tint", "name": "rom&nd Juicy Lasting Tint", "nameKo": "롬앤 쥬시 래스팅 틴트", "cat": "maquillaje", "krwMin": 9000, "krwMax": 12000, "bobMin": 150, "bobMax": 220, "confKr": "estimado", "confBo": "estimado", "weightG": 15},
  {"id": "peripera-tint", "name": "Peripera Ink Velvet", "nameKo": "페리페라 잉크 벨벳", "cat": "maquillaje", "krwMin": 8000, "krwMax": 10000, "bobMin": 140, "bobMax": 200, "confKr": "estimado", "confBo": "estimado", "weightG": 15},
  {"id": "medicube-ager", "name": "Medicube Age-R Booster Pro", "nameKo": "메디큐브 에이지알 부스터 프로", "cat": "dispositivos", "krwMin": 200000, "krwMax": 300000, "bobMin": 2100, "bobMax": 3100, "confKr": "estimado", "confBo": "estimado", "note": "El dispositivo casero más vendido de Corea. En Latinoamérica se consigue entre $300 y $450, cuando se consigue. Revisá que el cargador diga 100–240V.", "volt": "revisar", "weightG": 400},
  {"id": "lg-pral", "name": "LG Pra.L Derma Thera", "nameKo": "LG 프라엘 더마쎄라", "cat": "dispositivos", "krwMin": 400000, "krwMax": 600000, "confKr": "estimado", "note": "Gama alta. Verificá el voltaje del cargador antes de pagar: si dice sólo 220V, en una toma de 115V de La Paz no arranca.", "volt": "riesgo", "weightG": 800},
  {"id": "lentes-mayorista", "name": "Lentes con receta, par completo (Namdaemun)", "nameKo": "안경 맞춤 (남대문)", "cat": "opticas", "krwMin": 30000, "krwMax": 60000, "bobMin": 700, "bobMax": 1500, "confKr": "verificado", "confBo": "verificado", "note": "Examen de vista gratis en el momento y los lentes terminados en 20–30 minutos. Sin cita ni receta previa. Los progresivos son la excepción: tardan de 3 a 7 días.", "weightG": 40},
  {"id": "lentes-davich", "name": "Lentes con receta, par completo (Davich)", "nameKo": "다비치안경 맞춤", "cat": "opticas", "krwMin": 50000, "krwMax": 150000, "bobMin": 700, "bobMax": 1500, "confKr": "verificado", "confBo": "verificado", "note": "Precio fijo y publicado, el mismo para locales y extranjeros. Atienden en inglés.", "weightG": 40},
  {"id": "lentes-cambio", "name": "Cambiar los lentes a tu marco actual", "nameKo": "기존 안경테 렌즈 교체", "cat": "opticas", "krwMin": 30000, "krwMax": 60000, "bobMin": 500, "bobMax": 1200, "confKr": "verificado", "confBo": "estimado", "note": "Llevá tu marco viejo de repuesto: te ponen cristales nuevos en veinte minutos por unos $25.", "weightG": 0},
  {"id": "kolon-jacket", "name": "Campera outdoor Kolon Sport", "nameKo": "코오롱스포츠 자켓", "cat": "ropa", "krwMin": 150000, "krwMax": 300000, "confKr": "estimado", "note": "Calidad tipo Arc'teryx a mitad de precio. En outlet fuera de temporada, la mitad de eso.", "weightG": 600},
  {"id": "blackyak-down", "name": "Campera de pluma ligera Blackyak", "nameKo": "블랙야크 경량 패딩", "cat": "ropa", "krwMin": 150000, "krwMax": 300000, "confKr": "estimado", "weightG": 400},
  {"id": "musinsa-basics", "name": "Básicos Musinsa Standard (por prenda)", "nameKo": "무신사 스탠다드", "cat": "ropa", "krwMin": 20000, "krwMax": 50000, "confKr": "estimado", "note": "El talle coreano corre chico: si usás L, pedí XL.", "weightG": 300},
  {"id": "goto-tshirt", "name": "Remeras y básicos en Goto Mall", "nameKo": "고투몰 티셔츠", "cat": "ropa", "krwMin": 5000, "krwMax": 15000, "confKr": "verificado", "note": "El mejor precio/calidad de Seúl para ropa. Casi todo en efectivo y sin probador.", "weightG": 200},
  {"id": "medias", "name": "Medias y ropa interior (pack de 10)", "nameKo": "양말 10켤레", "cat": "ropa", "krwMin": 10000, "krwMax": 20000, "confKr": "verificado", "note": "A ₩1.000–2.000 el par comprando de a diez. De lo más fácil de meter en la maleta y de lo más caro proporcionalmente en Bolivia.", "weightG": 300},
  {"id": "leopold-kb", "name": "Teclado mecánico Leopold", "nameKo": "레오폴드 키보드", "cat": "electronica", "krwMin": 120000, "krwMax": 200000, "bobMin": 3000, "bobMax": 3700, "confKr": "estimado", "confBo": "estimado", "note": "Marca coreana de culto. En Bolivia no se consigue; importado no baja de $250.", "volt": "ok", "weightG": 900},
  {"id": "camara-usada", "name": "Cámara o lente usado (Yongsan)", "nameKo": "중고 카메라 렌즈", "cat": "electronica", "confKr": "estimado", "note": "La ventaja no es sólo el precio: podés probar el autofoco, revisar el vidrio a contraluz y pedir el contador de disparos antes de pagar.", "volt": "ok"},
  {"id": "ssd", "name": "SSD y almacenamiento", "nameKo": "SSD 외장하드", "cat": "electronica", "confKr": "estimado", "note": "Precio competitivo y sin problema de voltaje ni de garantía relevante.", "volt": "ok"},
  {"id": "cables-daiso", "name": "Cables, hubs USB-C, cargadores y power banks", "nameKo": "케이블 USB 허브 보조배터리", "cat": "electronica", "krwMin": 1000, "krwMax": 15000, "confKr": "verificado", "note": "Calidad decente a precio de descarte en Daiso y tiendas de conveniencia. Traé diez.", "volt": "ok", "weightG": 80},
  {"id": "audio", "name": "Micrófonos, interfaces y auriculares", "nameKo": "마이크 오디오 인터페이스", "cat": "electronica", "confKr": "estimado", "note": "Podés probarlo en el local antes de comprar, que es la mitad del valor.", "volt": "revisar"},
  {"id": "kgc-everytime30", "name": "KGC Jung Kwan Jang Everytime, 30 sobres", "nameKo": "정관장 홍삼정 에브리타임 30포", "cat": "ginseng", "krwMin": 107000, "krwMax": 107000, "confKr": "verificado", "note": "Un mes de tratamiento. Precio oficial de tienda verificado. En Bolivia el original es carísimo o directamente no se consigue.", "weightG": 400},
  {"id": "kgc-everytime180", "name": "KGC Everytime, 180 sobres", "nameKo": "정관장 에브리타임 180포", "cat": "ginseng", "krwMin": 562000, "krwMax": 562000, "confKr": "verificado", "note": "Sale ₩3.124 por sobre contra ₩3.567 del pack de 30: 12% más barato por unidad. Compará siempre por sobre, no por caja.", "weightG": 2200},
  {"id": "kgc-royal-duty", "name": "KGC Everytime Royal, edición duty free 100 sobres", "nameKo": "정관장 에브리타임 로얄 면세", "cat": "ginseng", "krwMin": 334000, "krwMax": 334000, "confKr": "verificado", "note": "Presentación que no existe en tienda normal. Unos $248 en el duty free de Incheon.", "weightG": 1300},
  {"id": "ginseng-candy", "name": "Caramelos de ginseng rojo", "nameKo": "홍삼 캔디", "cat": "ginseng", "krwMin": 3000, "krwMax": 8000, "confKr": "estimado", "note": "El regalo barato que siempre funciona.", "weightG": 200},
  {"id": "gim-set", "name": "Gim (alga tostada), set de regalo", "nameKo": "재래김 선물세트", "cat": "comida", "krwMin": 8000, "krwMax": 20000, "confKr": "estimado", "note": "Ultraliviano. El regalo coreano por excelencia.", "weightG": 300},
  {"id": "buldak-multi", "name": "Buldak ramyeon, multipack de 5", "nameKo": "불닭볶음면 멀티팩", "cat": "comida", "krwMin": 4000, "krwMax": 6000, "bobMin": 75, "bobMax": 125, "confKr": "estimado", "confBo": "estimado", "note": "En Bolivia el paquete individual va a Bs 15–25.", "weightG": 700},
  {"id": "maxim-mocha", "name": "Maxim Mocha Gold, café instantáneo 100 sticks", "nameKo": "맥심 모카골드 커피믹스 100T", "cat": "comida", "krwMin": 12000, "krwMax": 16000, "confKr": "estimado", "note": "Adicción nacional coreana y excelente regalo de oficina: rinde cien personas.", "weightG": 1200},
  {"id": "honey-almond", "name": "Almendras de miel y mantequilla, pack grande", "nameKo": "허니버터아몬드 대용량", "cat": "comida", "krwMin": 5000, "krwMax": 9000, "confKr": "estimado", "note": "El souvenir comestible número uno. Compralo en Emart o Costco, nunca en las tiendas de souvenirs de Myeongdong.", "weightG": 500},
  {"id": "bagel-chips", "name": "Honey Butter Bagel Chips (Olive Young)", "nameKo": "허니버터 베이글칩", "cat": "comida", "krwMin": 3000, "krwMax": 5000, "confKr": "estimado", "note": "El snack que los turistas compran por docenas.", "weightG": 100},
  {"id": "yuja-cheong", "name": "Yuja-cheong, mermelada de yuzu para té", "nameKo": "유자차 청", "cat": "comida", "krwMin": 8000, "krwMax": 14000, "confKr": "estimado", "note": "Pesado y pastoso: va en bodega, nunca en cabina.", "weightG": 1000},
  {"id": "gochujang-tube", "name": "Gochujang o doenjang en tubo", "nameKo": "고추장 튜브", "cat": "comida", "krwMin": 3000, "krwMax": 6000, "confKr": "estimado", "note": "El tubo pesa menos que el pote y no se derrama en la maleta.", "weightG": 150},
  {"id": "pepero", "name": "Pepero y Choco Pie", "nameKo": "빼빼로 초코파이", "cat": "comida", "krwMin": 1500, "krwMax": 4000, "confKr": "estimado", "note": "Regalo de bajo costo para repartir en la oficina.", "weightG": 200},
  {"id": "sesame-oil", "name": "Aceite de sésamo tostado", "nameKo": "참기름", "cat": "comida", "krwMin": 8000, "krwMax": 15000, "confKr": "estimado", "note": "Va en bodega, envuelto en ropa.", "weightG": 500},
  {"id": "cubiertos", "name": "Juego de cubiertos de acero coreano", "nameKo": "스테인리스 수저세트", "cat": "cocina", "krwMin": 1000, "krwMax": 3000, "confKr": "verificado", "note": "Palillos planos y cuchara larga: el formato coreano no se consigue en Bolivia. ₩1.000–3.000 el par en Daiso.", "weightG": 100},
  {"id": "samgyeopsal-plancha", "name": "Plancha de samgyeopsal con canal de grasa", "nameKo": "삼겹살 불판 가정용", "cat": "cocina", "krwMin": 15000, "krwMax": 40000, "confKr": "estimado", "note": "Voluminoso pero único. Sirve para los asados en casa.", "weightG": 1500},
  {"id": "locknlock", "name": "Contenedores Lock&Lock", "nameKo": "락앤락 밀폐용기", "cat": "cocina", "krwMin": 5000, "krwMax": 20000, "confKr": "estimado", "weightG": 400},
  {"id": "tijeras", "name": "Tijeras de cocina coreanas", "nameKo": "주방가위", "cat": "cocina", "krwMin": 5000, "krwMax": 15000, "confKr": "estimado", "note": "Las de acero coreano son excelentes. Van en bodega, obviamente.", "weightG": 150},
  {"id": "yangeun-nambi", "name": "Olla de aluminio para ramyeon", "nameKo": "양은냄비", "cat": "cocina", "krwMin": 5000, "krwMax": 10000, "confKr": "estimado", "weightG": 250},
  {"id": "monami", "name": "Bolígrafos Monami, set", "nameKo": "모나미 볼펜세트", "cat": "regalos", "krwMin": 5000, "krwMax": 20000, "confKr": "estimado", "weightG": 200},
  {"id": "papeleria-kawaii", "name": "Papelería y agendas", "nameKo": "문구 다이어리", "cat": "regalos", "krwMin": 2000, "krwMax": 15000, "confKr": "estimado", "weightG": 200},
  {"id": "accesorios-pelo", "name": "Accesorios de pelo (clips, scrunchies)", "nameKo": "헤어핀 곱창밴드", "cat": "regalos", "krwMin": 1000, "krwMax": 5000, "confKr": "estimado", "weightG": 30},
  {"id": "kakao-merch", "name": "Merch de Kakao Friends o Line Friends", "nameKo": "카카오프렌즈 라인프렌즈 굿즈", "cat": "regalos", "krwMin": 10000, "krwMax": 40000, "confKr": "estimado", "weightG": 300},
  {"id": "artesania-insadong", "name": "Artesanía tradicional de Insadong", "nameKo": "인사동 전통공예", "cat": "regalos", "krwMin": 5000, "krwMax": 50000, "confKr": "estimado", "note": "Celadón, abanicos, marcapáginas de hanji, joyeros de nácar. Dedicale una tarde.", "weightG": 400},
  {"id": "sello-hangul", "name": "Sello personalizado con tu nombre en hangul", "nameKo": "도장", "cat": "regalos", "krwMin": 10000, "krwMax": 30000, "confKr": "estimado", "weightG": 80},
  {"id": "kpop-album", "name": "Álbum de K-pop", "nameKo": "케이팝 앨범", "cat": "regalos", "krwMin": 15000, "krwMax": 40000, "confKr": "estimado", "note": "En Bolivia se venden con recargo enorme y hay demanda real. Pero pesan (llevan photobook) y son frágiles.", "weightG": 400},
];

export const PRODUCT_BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));
