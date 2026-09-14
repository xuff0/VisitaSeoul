// Semilla de lugares. Vive en el repo, no en la base de datos: carga instantánea, funciona
// sin señal desde el primer segundo y no hay que copiar 134 filas por cada persona que entra.
// Lo que guarda la base son sólo tus cambios — ver lib/db/repo.ts.
//
// Los primeros 86 vienen del seulsitios.html original (parseados, no re-tecleados); algunos
// cambiaron de grupo ahora que hay categorías más precisas. Los 48 restantes salen de la guía
// de compras para Bolivia.

export type CategoryId =
  | "turismo"
  | "kbeauty"
  | "malls"
  | "ofertas"
  | "electronica"
  | "conveniencia"
  | "opticas"
  | "ginseng"
  | "comida"
  | "ropa"
  | "otros";

export type Zone = "seul" | "alrededores";

export type Category = {
  id: CategoryId | string;
  label: string;
  /** Color del punto en el mapa y de la barra lateral de la ficha. */
  color: string;
  /** Glifo del marcador: con once categorías el color solo no alcanza para distinguirlas. */
  icon: string;
};

/** Avisos cortos que cambian cómo comprás: horarios raros, si se regatea, si hay IVA en caja. */
export type TagId =
  | "taxfree"
  | "promo11"
  | "regateo"
  | "cierra13dom"
  | "efectivo"
  | "nocturno"
  | "mayorista"
  | "mediodia";

export type PlaceSeed = {
  /** Estable y derivado del nombre: es la clave con la que se guardan tus ediciones. */
  id: string;
  /** Nombre en español. */
  n: string;
  /** Nombre en coreano — lo que se muestra en el mostrador y lo que busca Naver. */
  k: string;
  c: CategoryId;
  z: Zone;
  /** Barrio o ciudad. */
  d: string;
  lat: number;
  lng: number;
  /** Nota: qué hacer ahí, a qué hora ir, qué mirar. */
  t?: string;
  tags?: TagId[];
  hours?: string;
  /** Ids de productos del catálogo de compras que conviene comprar en este lugar. */
  buy?: string[];
};

export const CATEGORIES: Category[] = [
  { id: "turismo", label: "Turismo", color: "#1f7a4c", icon: "🏛" },
  { id: "kbeauty", label: "K-beauty", color: "#d6336c", icon: "💄" },
  { id: "malls", label: "Centros comerciales", color: "#7048e8", icon: "🛍" },
  { id: "ofertas", label: "Mercados y ofertas", color: "#c8342f", icon: "🏷" },
  { id: "electronica", label: "Electrónica", color: "#1668b3", icon: "🔌" },
  { id: "conveniencia", label: "Conveniencia", color: "#0b7285", icon: "🏪" },
  { id: "opticas", label: "Ópticas", color: "#2f4858", icon: "👓" },
  { id: "ginseng", label: "Ginseng y salud", color: "#5c940d", icon: "🌿" },
  { id: "comida", label: "Comida y snacks", color: "#e8590c", icon: "🍜" },
  { id: "ropa", label: "Ropa y outdoor", color: "#9c36b5", icon: "👕" },
  { id: "otros", label: "Otros", color: "#868e96", icon: "📍" },
];

export const TAGS: { id: TagId; label: string }[] = [
  { id: "taxfree", label: "Tax refund inmediato" },
  { id: "promo11", label: "Promos 1+1" },
  { id: "regateo", label: "Se regatea" },
  { id: "cierra13dom", label: "Cierra 1er y 3er domingo" },
  { id: "efectivo", label: "Mejor con efectivo" },
  { id: "nocturno", label: "Abre de noche" },
  { id: "mayorista", label: "Precio mayorista" },
  { id: "mediodia", label: "Lleva medio día" },
];

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));
export const TAG_BY_ID = new Map(TAGS.map((t) => [t.id, t]));

export const SEED_PLACES: PlaceSeed[] = [
  {"id": "s-palacio-gyeongbokgung", "n": "Palacio Gyeongbokgung", "k": "경복궁", "c": "turismo", "z": "seul", "d": "Jongno", "lat": 37.5796, "lng": 126.977, "t": "El palacio grande. Cambio de guardia 10:00 y 14:00, cerrado los martes. Con hanbok alquilado no se paga entrada."},
  {"id": "s-palacio-changdeokgung-y-jardin-secreto", "n": "Palacio Changdeokgung y Jardín Secreto", "k": "창덕궁", "c": "turismo", "z": "seul", "d": "Jongno", "lat": 37.5794, "lng": 126.991, "t": "Patrimonio de la Unesco. El Huwon (jardín) se visita solo con recorrido guiado y entrada aparte; se agota temprano."},
  {"id": "s-palacio-deoksugung", "n": "Palacio Deoksugung", "k": "덕수궁", "c": "turismo", "z": "seul", "d": "Jung-gu", "lat": 37.5658, "lng": 126.9751, "t": "Mezcla de edificios coreanos y occidentales. El muro de piedra de afuera es lindo de noche."},
  {"id": "s-palacio-changgyeonggung", "n": "Palacio Changgyeonggung", "k": "창경궁", "c": "turismo", "z": "seul", "d": "Jongno", "lat": 37.5784, "lng": 126.9942, "t": "El más tranquilo. Se conecta a pie con Changdeokgung."},
  {"id": "s-santuario-jongmyo", "n": "Santuario Jongmyo", "k": "종묘", "c": "turismo", "z": "seul", "d": "Jongno", "lat": 37.5747, "lng": 126.994, "t": "Santuario real de la dinastía Joseon. Casi todos los días se entra solo con visita guiada."},
  {"id": "s-aldea-hanok-de-bukchon", "n": "Aldea hanok de Bukchon", "k": "북촌한옥마을", "c": "turismo", "z": "seul", "d": "Jongno", "lat": 37.5826, "lng": 126.983, "t": "Barrio de casas tradicionales habitadas. Hay horario limitado y pedido de silencio: mejor de mañana."},
  {"id": "s-ikseon-dong", "n": "Ikseon-dong", "k": "익선동", "c": "turismo", "z": "seul", "d": "Jongno", "lat": 37.5735, "lng": 126.9903, "t": "Callejones de hanok convertidos en cafés y restaurantes. Bueno para la tarde."},
  {"id": "s-torre-n-de-seul-namsan", "n": "Torre N de Seúl (Namsan)", "k": "남산서울타워", "c": "turismo", "z": "seul", "d": "Yongsan", "lat": 37.5512, "lng": 126.9882, "t": "Vista de toda la ciudad. Se sube en teleférico o en el bus Namsan Sunset. Ir cerca del atardecer."},
  {"id": "s-arroyo-cheonggyecheon", "n": "Arroyo Cheonggyecheon", "k": "청계천", "c": "turismo", "z": "seul", "d": "Jung-gu", "lat": 37.5696, "lng": 126.9784, "t": "Paseo peatonal hundido bajo el nivel de la calle. Caminata fresca de noche."},
  {"id": "s-insadong", "n": "Insadong", "k": "인사동", "c": "turismo", "z": "seul", "d": "Jongno", "lat": 37.574, "lng": 126.985, "t": "Calle de artesanías, papel hanji, té y pinceles. Buen lugar para recuerdos.", "buy": ["artesania-insadong", "sello-hangul", "monami"]},
  {"id": "s-plaza-gwanghwamun", "n": "Plaza Gwanghwamun", "k": "광화문광장", "c": "turismo", "z": "seul", "d": "Jongno", "lat": 37.5725, "lng": 126.9769, "t": "Estatuas del rey Sejong y del almirante Yi Sun-sin, con museos abajo."},
  {"id": "s-dongdaemun-design-plaza-ddp", "n": "Dongdaemun Design Plaza (DDP)", "k": "동대문디자인플라자", "c": "turismo", "z": "seul", "d": "Jung-gu", "lat": 37.5665, "lng": 127.0092, "t": "Edificio de Zaha Hadid. De noche se iluminan las rosas LED y abre el mercado nocturno."},
  {"id": "s-seoul-sky-lotte-world-tower", "n": "Seoul Sky, Lotte World Tower", "k": "롯데월드타워 서울스카이", "c": "turismo", "z": "seul", "d": "Songpa", "lat": 37.5125, "lng": 127.1025, "t": "Mirador en el piso 118. Comprar entrada con horario; el día claro se ve hasta Incheon."},
  {"id": "s-lotte-world-adventure", "n": "Lotte World Adventure", "k": "롯데월드 어드벤처", "c": "turismo", "z": "seul", "d": "Songpa", "lat": 37.5111, "lng": 127.098, "t": "Parque de diversiones techado más patio exterior. Entre semana hay menos fila."},
  {"id": "s-bosque-de-seul", "n": "Bosque de Seúl", "k": "서울숲", "c": "turismo", "z": "seul", "d": "Seongdong", "lat": 37.5443, "lng": 127.0374, "t": "Parque grande con ciervos y bicicletas. Se combina con los cafés de Seongsu."},
  {"id": "s-parque-hangang-de-yeouido", "n": "Parque Hangang de Yeouido", "k": "여의도한강공원", "c": "turismo", "z": "seul", "d": "Yeongdeungpo", "lat": 37.5285, "lng": 126.934, "t": "Ramyeon de máquina, mantas y pollo a domicilio a la orilla del río. Clásico de atardecer."},
  {"id": "s-fuente-arcoiris-del-puente-banpo", "n": "Fuente arcoíris del puente Banpo", "k": "반포대교 달빛무지개분수", "c": "turismo", "z": "seul", "d": "Seocho", "lat": 37.5127, "lng": 126.9955, "t": "Chorros de agua con luces desde el puente, en temporada cálida y varias veces por noche. Se ve desde el parque Banpo."},
  {"id": "s-museo-nacional-de-corea", "n": "Museo Nacional de Corea", "k": "국립중앙박물관", "c": "turismo", "z": "seul", "d": "Yongsan", "lat": 37.5238, "lng": 126.9805, "t": "Enorme y gratuito en la exposición permanente. La pagoda dorada y la sala budista valen la visita."},
  {"id": "s-museo-memorial-de-la-guerra", "n": "Museo Memorial de la Guerra", "k": "전쟁기념관", "c": "turismo", "z": "seul", "d": "Yongsan", "lat": 37.5366, "lng": 126.977, "t": "Gratis. Explica bien la guerra de Corea; afuera hay aviones y tanques."},
  {"id": "s-museo-leeum", "n": "Museo Leeum", "k": "리움미술관", "c": "turismo", "z": "seul", "d": "Yongsan", "lat": 37.5384, "lng": 126.999, "t": "Arte antiguo y contemporáneo en edificios de Mario Botta, Nouvel y Koolhaas."},
  {"id": "s-parque-nacional-bukhansan", "n": "Parque Nacional Bukhansan", "k": "북한산국립공원", "c": "turismo", "z": "seul", "d": "Norte de Seúl", "lat": 37.6588, "lng": 126.9776, "t": "Montaña dentro de la ciudad. Media jornada de caminata; llevar agua y zapatillas con agarre."},
  {"id": "s-parque-naksan-y-muralla-de-seul", "n": "Parque Naksan y muralla de Seúl", "k": "낙산공원", "c": "turismo", "z": "seul", "d": "Jongno", "lat": 37.5808, "lng": 127.0072, "t": "Tramo de muralla con vista al centro. Subir al atardecer y bajar por Ihwa."},
  {"id": "s-aldea-mural-de-ihwa", "n": "Aldea mural de Ihwa", "k": "이화벽화마을", "c": "turismo", "z": "seul", "d": "Jongno", "lat": 37.5789, "lng": 127.0059, "t": "Callejuelas pintadas en la ladera. Es un barrio con vecinos: bajar la voz."},
  {"id": "s-parque-olimpico", "n": "Parque Olímpico", "k": "올림픽공원", "c": "turismo", "z": "seul", "d": "Songpa", "lat": 37.5202, "lng": 127.1215, "t": "El árbol solitario y esculturas al aire libre. Muy grande, conviene alquilar bici."},
  {"id": "s-parque-seonyudo", "n": "Parque Seonyudo", "k": "선유도공원", "c": "turismo", "z": "seul", "d": "Yeongdeungpo", "lat": 37.5426, "lng": 126.898, "t": "Isla que era planta de agua, hoy jardín entre estructuras de hormigón."},
  {"id": "s-templo-bongeunsa", "n": "Templo Bongeunsa", "k": "봉은사", "c": "turismo", "z": "seul", "d": "Gangnam", "lat": 37.515, "lng": 127.0576, "t": "Templo con el Buda de pie frente a las torres de COEX. Hay programa de estadía en templo."},
  {"id": "s-templo-jogyesa", "n": "Templo Jogyesa", "k": "조계사", "c": "turismo", "z": "seul", "d": "Jongno", "lat": 37.5747, "lng": 126.9816, "t": "Templo principal del budismo coreano, en pleno centro. Farolitos de colores todo el año."},
  {"id": "s-aldea-hanok-de-namsangol", "n": "Aldea hanok de Namsangol", "k": "남산골한옥마을", "c": "turismo", "z": "seul", "d": "Jung-gu", "lat": 37.5593, "lng": 126.9942, "t": "Cinco casas tradicionales trasladadas, con jardín. Entrada gratis."},
  {"id": "s-prision-de-seodaemun", "n": "Prisión de Seodaemun", "k": "서대문형무소역사관", "c": "turismo", "z": "seul", "d": "Seodaemun", "lat": 37.5745, "lng": 126.956, "t": "Cárcel de la ocupación japonesa, hoy museo. Visita dura pero muy explicativa."},
  {"id": "s-cheong-wa-dae-la-casa-azul", "n": "Cheong Wa Dae, la Casa Azul", "k": "청와대", "c": "turismo", "z": "seul", "d": "Jongno", "lat": 37.5866, "lng": 126.9748, "t": "La antigua residencia presidencial, abierta al público. Conviene reservar el ingreso en línea."},
  {"id": "s-parque-hangang-de-ttukseom", "n": "Parque Hangang de Ttukseom", "k": "뚝섬한강공원", "c": "turismo", "z": "seul", "d": "Gwangjin", "lat": 37.529, "lng": 127.07, "t": "Ribera con piscinas de verano y el mirador de vidrio J-Bug."},
  {"id": "s-sendero-del-antiguo-tren-gyeongui", "n": "Sendero del antiguo tren Gyeongui", "k": "경의선숲길", "c": "turismo", "z": "seul", "d": "Mapo", "lat": 37.556, "lng": 126.9245, "t": "Vía de tren convertida en parque lineal, entre Hongdae y Yeonnam. Le dicen Yeontral Park."},
  {"id": "s-fortaleza-hwaseong-suwon", "n": "Fortaleza Hwaseong (Suwon)", "k": "수원화성", "c": "turismo", "z": "alrededores", "d": "Suwon", "lat": 37.2881, "lng": 127.0146, "t": "Muralla del siglo XVIII, Unesco. Una hora en metro línea 1; se puede caminar el circuito completo."},
  {"id": "s-aldea-folclorica-coreana-yongin", "n": "Aldea folclórica coreana (Yongin)", "k": "한국민속촌", "c": "turismo", "z": "alrededores", "d": "Yongin", "lat": 37.2593, "lng": 127.118, "t": "Pueblo tradicional en funcionamiento, con espectáculos de jinetes y música. Día completo."},
  {"id": "s-everland", "n": "Everland", "k": "에버랜드", "c": "turismo", "z": "alrededores", "d": "Yongin", "lat": 37.294, "lng": 127.202, "t": "El parque de diversiones más grande del país. La montaña rusa de madera T Express es la atracción."},
  {"id": "s-isla-nami", "n": "Isla Nami", "k": "남이섬", "c": "turismo", "z": "alrededores", "d": "Gapyeong", "lat": 37.7906, "lng": 127.5257, "t": "Alamedas famosas por los dramas coreanos. Se llega en tren ITX a Gapyeong y ferry."},
  {"id": "s-petite-france", "n": "Petite France", "k": "쁘띠프랑스", "c": "turismo", "z": "alrededores", "d": "Gapyeong", "lat": 37.7723, "lng": 127.517, "t": "Pueblito temático francés. Se combina con Nami y el Jardín de la Mañana Tranquila en un mismo día."},
  {"id": "s-jardin-de-la-manana-tranquila", "n": "Jardín de la Mañana Tranquila", "k": "아침고요수목원", "c": "turismo", "z": "alrededores", "d": "Gapyeong", "lat": 37.744, "lng": 127.354, "t": "Jardín botánico de montaña. En otoño e invierno hay iluminación nocturna."},
  {"id": "s-imjingak-y-zona-del-dmz", "n": "Imjingak y zona del DMZ", "k": "임진각", "c": "turismo", "z": "alrededores", "d": "Paju", "lat": 37.8886, "lng": 126.7402, "t": "Parque junto a la frontera, con el puente de la Libertad. Para pasar al tercer túnel o al JSA hace falta tour con pasaporte."},
  {"id": "s-chinatown-de-incheon", "n": "Chinatown de Incheon", "k": "인천 차이나타운", "c": "turismo", "z": "alrededores", "d": "Incheon", "lat": 37.475, "lng": 126.6178, "t": "Cuna del jjajangmyeon, con el barrio de cuentos Songwol al lado. Línea 1 hasta Incheon."},
  {"id": "s-songdo-central-park", "n": "Songdo Central Park", "k": "송도센트럴파크", "c": "turismo", "z": "alrededores", "d": "Incheon", "lat": 37.3925, "lng": 126.639, "t": "Ciudad nueva con canal de agua salada y botes. Buena parada si tenés horas antes del vuelo."},
  {"id": "s-fortaleza-namhansanseong", "n": "Fortaleza Namhansanseong", "k": "남한산성", "c": "turismo", "z": "alrededores", "d": "Gwangju, Gyeonggi", "lat": 37.479, "lng": 127.1817, "t": "Muralla de montaña, Unesco, con restaurantes de comida casera. Metro línea 8 y bus."},
  {"id": "s-cueva-de-gwangmyeong", "n": "Cueva de Gwangmyeong", "k": "광명동굴", "c": "turismo", "z": "alrededores", "d": "Gwangmyeong", "lat": 37.446, "lng": 126.864, "t": "Mina abandonada convertida en cueva de luces y vino. Fresca todo el año, llevar abrigo."},
  {"id": "s-heyri-pueblo-de-artistas", "n": "Heyri, pueblo de artistas", "k": "헤이리예술마을", "c": "turismo", "z": "alrededores", "d": "Paju", "lat": 37.792, "lng": 126.69, "t": "Galerías, librerías y arquitectura. Se combina con Paju Book City y el outlet."},
  {"id": "s-dolmenes-de-ganghwa", "n": "Dólmenes de Ganghwa", "k": "강화 고인돌 유적", "c": "turismo", "z": "alrededores", "d": "Isla Ganghwa", "lat": 37.748, "lng": 126.434, "t": "Tumbas megalíticas Unesco en la isla. Se llega en bus desde Sinchon."},
  {"id": "s-wolmido-incheon", "n": "Wolmido (Incheon)", "k": "월미도", "c": "turismo", "z": "alrededores", "d": "Incheon", "lat": 37.474, "lng": 126.597, "t": "Malecón con ferias, marisco y el monorriel Wolmi Sea Train."},
  {"id": "s-seoul-grand-park-y-zoologico", "n": "Seoul Grand Park y zoológico", "k": "서울대공원", "c": "turismo", "z": "alrededores", "d": "Gwacheon", "lat": 37.427, "lng": 127.018, "t": "Zoológico, teleférico y el museo de arte contemporáneo MMCA al lado."},
  {"id": "s-starfield-coex-mall", "n": "Starfield COEX Mall", "k": "스타필드 코엑스몰", "c": "malls", "z": "seul", "d": "Gangnam", "lat": 37.5115, "lng": 127.0595, "t": "El subterráneo más grande de la ciudad, con la biblioteca Byeolmadang de estantes gigantes y acuario.", "tags": ["taxfree"], "buy": ["kpop-album"]},
  {"id": "s-lotte-world-mall", "n": "Lotte World Mall", "k": "롯데월드몰", "c": "malls", "z": "seul", "d": "Songpa", "lat": 37.5133, "lng": 127.1028, "t": "Bajo la torre: cine, acuario, supermercado y marcas. Todo bajo techo si llueve."},
  {"id": "s-the-hyundai-seoul", "n": "The Hyundai Seoul", "k": "더현대 서울", "c": "malls", "z": "seul", "d": "Yeouido", "lat": 37.5259, "lng": 126.9285, "t": "El más nuevo y luminoso, con jardín interior en el piso alto y pop-ups que cambian seguido.", "tags": ["taxfree"]},
  {"id": "s-ifc-mall", "n": "IFC Mall", "k": "아이에프씨몰", "c": "malls", "z": "seul", "d": "Yeouido", "lat": 37.5255, "lng": 126.9255, "t": "Tranquilo, con patio de comidas y cine. Pegado a The Hyundai."},
  {"id": "s-times-square-yeongdeungpo", "n": "Times Square Yeongdeungpo", "k": "타임스퀘어", "c": "malls", "z": "seul", "d": "Yeongdeungpo", "lat": 37.517, "lng": 126.9033, "t": "Centro comercial grande con supermercado E-Mart en el subsuelo."},
  {"id": "s-shinsegae-tienda-principal", "n": "Shinsegae, tienda principal", "k": "신세계백화점 본점", "c": "malls", "z": "seul", "d": "Myeongdong", "lat": 37.5606, "lng": 126.981, "t": "Edificio histórico con la fachada iluminada. Adentro está el duty free.", "tags": ["taxfree"]},
  {"id": "s-lotte-department-store-myeongdong", "n": "Lotte Department Store Myeongdong", "k": "롯데백화점 본점", "c": "malls", "z": "seul", "d": "Myeongdong", "lat": 37.565, "lng": 126.982, "t": "Tienda por departamentos, duty free en pisos altos y supermercado abajo.", "tags": ["taxfree"], "buy": ["kgc-everytime30"]},
  {"id": "s-i-park-mall-yongsan", "n": "I'Park Mall Yongsan", "k": "아이파크몰 용산", "c": "malls", "z": "seul", "d": "Yongsan", "lat": 37.5296, "lng": 126.9648, "t": "Sobre la estación de Yongsan, pegado al mercado de electrónica."},
  {"id": "s-hyundai-d-cube-city", "n": "Hyundai D-Cube City", "k": "현대백화점 디큐브시티", "c": "malls", "z": "seul", "d": "Sindorim", "lat": 37.509, "lng": 126.8895, "t": "Terrazas ajardinadas y buen patio de comidas, sobre la estación de Sindorim."},
  {"id": "s-common-ground", "n": "Common Ground", "k": "커먼그라운드", "c": "malls", "z": "seul", "d": "Konkuk", "lat": 37.541, "lng": 127.0665, "t": "Contenedores azules con marcas coreanas jóvenes. Rápido de recorrer."},
  {"id": "s-ak-hongdae", "n": "AK& Hongdae", "k": "에이케이앤 홍대", "c": "malls", "z": "seul", "d": "Hongdae", "lat": 37.5572, "lng": 126.925, "t": "Sobre la estación de Hongik Univ., útil para esperar o comprar sin sol."},
  {"id": "s-galleria-apgujeong", "n": "Galleria Apgujeong", "k": "갤러리아 백화점", "c": "malls", "z": "seul", "d": "Apgujeong", "lat": 37.527, "lng": 127.04, "t": "Lujo puro, con la fachada de escamas que cambia de color de noche."},
  {"id": "s-starfield-hanam", "n": "Starfield Hanam", "k": "스타필드 하남", "c": "malls", "z": "alrededores", "d": "Hanam", "lat": 37.5453, "lng": 127.224, "t": "Enorme, con parque acuático y cines. Ideal para un día de lluvia."},
  {"id": "s-starfield-goyang", "n": "Starfield Goyang", "k": "스타필드 고양", "c": "malls", "z": "alrededores", "d": "Goyang", "lat": 37.648, "lng": 126.893, "t": "Igual de grande que Hanam, al noroeste. Bus directo desde Seúl."},
  {"id": "s-myeongdong-calle-comercial", "n": "Myeongdong, calle comercial", "k": "명동", "c": "ofertas", "z": "seul", "d": "Jung-gu", "lat": 37.5636, "lng": 126.9827, "t": "Cosmética, zapatillas y puestos de comida. Los vendedores regalan muestras; los precios se comparan de local a local.", "tags": ["taxfree"], "buy": ["boj-sun", "cosrx-snail", "mediheal-mask"]},
  {"id": "s-mercado-namdaemun", "n": "Mercado Namdaemun", "k": "남대문시장", "c": "ofertas", "z": "seul", "d": "Jung-gu", "lat": 37.5591, "lng": 126.9776, "t": "El mercado tradicional más grande. Souvenirs, ropa de niños, lentes y ginseng, más barato al por mayor.", "tags": ["regateo", "mayorista", "efectivo"], "buy": ["medias", "gim-set"]},
  {"id": "s-mercado-dongdaemun-y-doota", "n": "Mercado Dongdaemun y Doota", "k": "두타몰", "c": "ropa", "z": "seul", "d": "Jung-gu", "lat": 37.571, "lng": 127.009, "t": "Ropa y telas casi toda la noche. Muchas torres abren de tarde y cierran de madrugada.", "tags": ["nocturno", "mayorista"], "hours": "muchas torres de 20:00 a 05:00"},
  {"id": "s-mercado-gwangjang", "n": "Mercado Gwangjang", "k": "광장시장", "c": "comida", "z": "seul", "d": "Jongno", "lat": 37.5701, "lng": 126.9997, "t": "Puestos de bindaetteok, mayak gimbap y tteokbokki. Preguntar precio antes de sentarse.", "tags": ["efectivo"], "hours": "puestos de comida 09:00–23:00"},
  {"id": "s-goto-mall-galeria-subterranea-de-gangnam", "n": "Goto Mall, galería subterránea de Gangnam", "k": "고투몰", "c": "ropa", "z": "seul", "d": "Terminal Express Bus", "lat": 37.5052, "lng": 127.0045, "t": "Cientos de locales de ropa y decoración bajo la terminal. Casi todo en efectivo y sin probador.", "tags": ["efectivo", "mayorista"], "hours": "10:00–22:00, cerrado algunos martes", "buy": ["goto-tshirt", "musinsa-basics"]},
  {"id": "s-calle-comercial-de-hongdae", "n": "Calle comercial de Hongdae", "k": "홍대 걷고싶은거리", "c": "ropa", "z": "seul", "d": "Mapo", "lat": 37.5535, "lng": 126.9245, "t": "Ropa joven, cosmética y músicos en la calle desde la tarde."},
  {"id": "s-calle-de-la-universidad-ewha", "n": "Calle de la universidad Ewha", "k": "이대 앞 쇼핑거리", "c": "ropa", "z": "seul", "d": "Seodaemun", "lat": 37.559, "lng": 126.946, "t": "Ropa y accesorios baratos pensados para estudiantes."},
  {"id": "s-mercado-de-electronica-de-yongsan", "n": "Mercado de electrónica de Yongsan", "k": "용산전자상가", "c": "electronica", "z": "seul", "d": "Yongsan", "lat": 37.53, "lng": 126.964, "t": "Componentes, cámaras y usados. Comparar precios y pedir factura.", "tags": ["regateo", "cierra13dom"], "buy": ["leopold-kb", "camara-usada", "ssd", "audio"]},
  {"id": "s-techno-mart-gangbyeon", "n": "Techno Mart Gangbyeon", "k": "강변테크노마트", "c": "electronica", "z": "seul", "d": "Gwangjin", "lat": 37.535, "lng": 127.095, "t": "Torre entera de electrónica y celulares, con precios negociables.", "tags": ["regateo"], "hours": "10:00–20:00, abre todos los domingos", "buy": ["leopold-kb", "ssd", "audio"]},
  {"id": "s-garosu-gil", "n": "Garosu-gil", "k": "가로수길", "c": "ropa", "z": "seul", "d": "Sinsa", "lat": 37.5205, "lng": 127.023, "t": "Avenida de gingkos con tiendas de diseño y cafés. Más caro, bueno para mirar."},
  {"id": "s-mercado-de-pulgas-seoul-folk", "n": "Mercado de pulgas Seoul Folk", "k": "서울풍물시장", "c": "ofertas", "z": "seul", "d": "Dongdaemun", "lat": 37.572, "lng": 127.027, "t": "Antigüedades, discos, ropa usada y cosas raras a precio bajo."},
  {"id": "s-ssamziegil-insadong", "n": "Ssamziegil, Insadong", "k": "쌈지길", "c": "ofertas", "z": "seul", "d": "Jongno", "lat": 37.5745, "lng": 126.9855, "t": "Espiral de talleres pequeños. Buen lugar para regalos hechos a mano.", "buy": ["artesania-insadong"]},
  {"id": "s-mercado-mangwon", "n": "Mercado Mangwon", "k": "망원시장", "c": "comida", "z": "seul", "d": "Mapo", "lat": 37.556, "lng": 126.904, "t": "Mercado de barrio, comida callejera barata y sin tanto turista.", "tags": ["efectivo"]},
  {"id": "s-paju-premium-outlets", "n": "Paju Premium Outlets", "k": "신세계 사이먼 파주 프리미엄 아울렛", "c": "ropa", "z": "alrededores", "d": "Paju", "lat": 37.7218, "lng": 126.735, "t": "Marcas internacionales con descuento, al aire libre. Se combina con Heyri.", "tags": ["mediodia"], "buy": ["kolon-jacket", "blackyak-down"]},
  {"id": "s-lotte-premium-outlet-gimpo", "n": "Lotte Premium Outlet Gimpo", "k": "롯데 프리미엄 아울렛 김포공항점", "c": "ropa", "z": "alrededores", "d": "Gimpo", "lat": 37.567, "lng": 126.742, "t": "Junto al aeropuerto de Gimpo, fácil en metro línea 9 o 5.", "buy": ["kolon-jacket", "blackyak-down"]},
  {"id": "s-hyundai-premium-outlet-songdo", "n": "Hyundai Premium Outlet Songdo", "k": "현대 프리미엄아울렛 송도점", "c": "ropa", "z": "alrededores", "d": "Incheon", "lat": 37.39, "lng": 126.642, "t": "Outlet grande camino a Incheon, con parque al lado.", "tags": ["mediodia"], "buy": ["kolon-jacket"]},
  {"id": "s-mercado-de-pescado-de-noryangjin", "n": "Mercado de pescado de Noryangjin", "k": "노량진수산시장", "c": "comida", "z": "seul", "d": "Dongjak", "lat": 37.515, "lng": 126.94, "t": "Se elige el marisco abajo y lo cocinan arriba por un extra. Acordar precio antes.", "tags": ["regateo", "nocturno"]},
  {"id": "s-dragon-hill-spa", "n": "Dragon Hill Spa", "k": "드래곤힐스파", "c": "otros", "z": "seul", "d": "Yongsan", "lat": 37.531, "lng": 126.964, "t": "Jjimjilbang abierto toda la noche, con salas de sal y piletas. Sirve para descansar entre trenes."},
  {"id": "s-itaewon", "n": "Itaewon", "k": "이태원", "c": "otros", "z": "seul", "d": "Yongsan", "lat": 37.5345, "lng": 126.9945, "t": "Barrio internacional, comida de todos lados y ropa en talles grandes."},
  {"id": "s-estacion-de-seul", "n": "Estación de Seúl", "k": "서울역", "c": "otros", "z": "seul", "d": "Jung-gu", "lat": 37.5547, "lng": 126.9707, "t": "Salen los KTX a Busan y el tren exprés al aeropuerto. Consigna de equipaje en el subsuelo."},
  {"id": "s-aeropuerto-de-incheon-terminal-1", "n": "Aeropuerto de Incheon, Terminal 1", "k": "인천국제공항 제1여객터미널", "c": "otros", "z": "alrededores", "d": "Incheon", "lat": 37.4491, "lng": 126.4506, "t": "El AREX exprés tarda unos 45 minutos desde Seúl. Verificá la terminal en el pasaje.", "buy": ["kgc-royal-duty", "honey-almond"]},
  {"id": "s-crucero-por-el-rio-han-muelle-de-yeouido", "n": "Crucero por el río Han, muelle de Yeouido", "k": "이랜드크루즈 여의도 선착장", "c": "otros", "z": "seul", "d": "Yeouido", "lat": 37.5175, "lng": 126.933, "t": "Paseo en barco de una hora. El de la puesta de sol coincide con la fuente de Banpo."},
  {"id": "s-catedral-de-myeongdong", "n": "Catedral de Myeongdong", "k": "명동성당", "c": "otros", "z": "seul", "d": "Jung-gu", "lat": 37.5633, "lng": 126.9873, "t": "Catedral de ladrillo de 1898, a un paso de las compras. Hay misas y patio con cafés."},
  {"id": "s-estacion-gangnam", "n": "Estación Gangnam", "k": "강남역", "c": "otros", "z": "seul", "d": "Gangnam", "lat": 37.4979, "lng": 127.0276, "t": "Punto de encuentro clásico, con galerías subterráneas y restaurantes hasta tarde."},
  {"id": "s-plazoleta-de-hongdae", "n": "Plazoleta de Hongdae", "k": "홍대 놀이터", "c": "otros", "z": "seul", "d": "Mapo", "lat": 37.5535, "lng": 126.923, "t": "Bandas y bailarines al aire libre desde la noche, sobre todo fines de semana."},
  {"id": "s-olive-young-myeongdong-town", "n": "Olive Young Myeongdong Town", "k": "올리브영 명동타운점", "c": "kbeauty", "z": "seul", "d": "Myeongdong", "lat": 37.5638, "lng": 126.9827, "t": "La sucursal más grande del país y la mejor surtida. Descuento de IVA en el mismo mostrador con pasaporte, y personal que habla inglés. Es el punto de partida obligado para k-beauty.", "tags": ["taxfree", "promo11"], "hours": "10:00–22:30", "buy": ["boj-sun", "boj-glow", "cosrx-snail", "anua-toner", "torriden-serum", "mediheal-mask", "biodance-mask", "tirtir-cushion", "medicube-pdrn"]},
  {"id": "s-olive-young-seongsu-flagship", "n": "Olive Young Seongsu (flagship)", "k": "올리브영 성수점", "c": "kbeauty", "z": "seul", "d": "Seongdong", "lat": 37.5445, "lng": 127.0557, "t": "La más nueva. Trae lanzamientos que tardan en llegar a las demás y suele tener stock de lo que en Myeongdong ya se agotó.", "tags": ["taxfree", "promo11"], "hours": "10:00–22:00", "buy": ["vt-reedle", "medicube-pdrn", "biodance-mask", "skin1004-ampoule"]},
  {"id": "s-olive-young-hongdae", "n": "Olive Young Hongdae", "k": "올리브영 홍대점", "c": "kbeauty", "z": "seul", "d": "Mapo", "lat": 37.5556, "lng": 126.924, "t": "Grande y con descuento de IVA en caja. Conviene si ya estás por Hongdae: evita el gentío de Myeongdong.", "tags": ["taxfree", "promo11"], "hours": "10:00–23:00", "buy": ["boj-sun", "roundlab-birch", "illiyoon-cream", "romnd-tint"]},
  {"id": "s-olive-young-gangnam", "n": "Olive Young Gangnam", "k": "올리브영 강남본점", "c": "kbeauty", "z": "seul", "d": "Gangnam", "lat": 37.4979, "lng": 127.0276, "t": "La opción del sur del río. Mismo catálogo y mismas promos semanales que las demás.", "tags": ["taxfree", "promo11"], "hours": "10:00–22:30", "buy": ["boj-glow", "drg-red", "torriden-serum"]},
  {"id": "s-olive-young-dongdaemun", "n": "Olive Young Dongdaemun", "k": "올리브영 동대문점", "c": "kbeauty", "z": "seul", "d": "Jung-gu", "lat": 37.571, "lng": 127.0095, "t": "Útil para combinar con la ropa de Dongdaemun sin cruzar la ciudad.", "tags": ["taxfree", "promo11"], "buy": ["mediheal-mask", "cosrx-snail"]},
  {"id": "s-amore-seongsu", "n": "Amore Seongsu", "k": "아모레 성수", "c": "kbeauty", "z": "seul", "d": "Seongdong", "lat": 37.5441, "lng": 127.0567, "t": "Showroom de Amorepacific en una antigua estación de servicio. Se prueba todo gratis y arman una rutina a medida. Más experiencia que precio: comprá en Olive Young.", "hours": "10:30–20:30, cerrado los lunes"},
  {"id": "s-chicor-gangnam-station", "n": "Chicor Gangnam Station", "k": "시코르 강남역점", "c": "kbeauty", "z": "seul", "d": "Gangnam", "lat": 37.5006, "lng": 127.0264, "t": "La respuesta coreana a Sephora: marcas de gama alta que Olive Young no tiene. Para comparar antes de decidir.", "tags": ["taxfree"]},
  {"id": "s-lotte-duty-free-myeongdong", "n": "Lotte Duty Free Myeongdong", "k": "롯데면세점 명동본점", "c": "kbeauty", "z": "seul", "d": "Myeongdong", "lat": 37.5652, "lng": 126.982, "t": "Duty free de centro: comprás acá y retirás en el aeropuerto. Tiene presentaciones de ginseng y cosmética que no existen en tienda normal. Llevá pasaporte y pasaje.", "tags": ["taxfree"], "hours": "09:30–18:30", "buy": ["kgc-royal-duty"]},
  {"id": "s-shinsegae-duty-free-myeongdong", "n": "Shinsegae Duty Free Myeongdong", "k": "신세계면세점 명동점", "c": "kbeauty", "z": "seul", "d": "Myeongdong", "lat": 37.5606, "lng": 126.981, "t": "El otro duty free del centro, arriba de la tienda principal de Shinsegae. Mismo esquema: retiro en Incheon.", "tags": ["taxfree"], "buy": ["kgc-royal-duty"]},
  {"id": "s-galeria-sunin-yongsan", "n": "Galería Sunin, Yongsan", "k": "선인상가", "c": "electronica", "z": "seul", "d": "Yongsan", "lat": 37.5325, "lng": 126.9655, "t": "El edificio más denso del complejo de Yongsan: componentes, usados y periféricos. Se regatea con 깎아 주세요 (kkakka juseyo). Pedí factura.", "tags": ["regateo", "cierra13dom"], "buy": ["leopold-kb", "ssd", "camara-usada"]},
  {"id": "s-kukje-electronics-center", "n": "Kukje Electronics Center", "k": "국제전자센터", "c": "electronica", "z": "seul", "d": "Seocho", "lat": 37.4846, "lng": 127.0345, "t": "Más ordenado que Yongsan y con precios a la vista. Bueno para audio: micrófonos, interfaces y auriculares que podés probar en el local.", "buy": ["audio", "ssd"]},
  {"id": "s-hi-mart-i-park-mall-yongsan", "n": "Hi-Mart I'Park Mall Yongsan", "k": "하이마트 용산아이파크몰점", "c": "electronica", "z": "seul", "d": "Yongsan", "lat": 37.5296, "lng": 126.9648, "t": "Cadena grande con precio fijo y tax refund. Sirve para tener una referencia honesta antes de regatear en el mercado de al lado.", "tags": ["taxfree"]},
  {"id": "s-apple-myeongdong", "n": "Apple Myeongdong", "k": "애플 명동", "c": "electronica", "z": "seul", "d": "Myeongdong", "lat": 37.5635, "lng": 126.983, "t": "Precio coreano de accesorios Apple, casi siempre por debajo del boliviano. Los equipos no convienen: garantía regional.", "tags": ["taxfree"]},
  {"id": "s-samsung-store-gangnam", "n": "Samsung Store Gangnam", "k": "삼성 강남", "c": "electronica", "z": "seul", "d": "Gangnam", "lat": 37.504, "lng": 127.025, "t": "Para ver equipos, no para comprarlos: los Samsung coreanos terminan en N, no se les puede apagar el sonido del obturador y la garantía no cubre servicio fuera de Corea."},
  {"id": "s-daiso-myeongdong", "n": "Daiso Myeongdong", "k": "다이소 명동역점", "c": "conveniencia", "z": "seul", "d": "Myeongdong", "lat": 37.5606, "lng": 126.9863, "t": "Varios pisos a ₩1.000–5.000. Acá se compra lo accesorio —algodones, botellitas de viaje, organizadores, cables— y las colaboraciones de belleza propias. El skincare serio, en Olive Young.", "hours": "10:00–22:00", "buy": ["cables-daiso", "cubiertos", "accesorios-pelo", "papeleria-kawaii"]},
  {"id": "s-daiso-hongdae", "n": "Daiso Hongdae", "k": "다이소 홍대입구역점", "c": "conveniencia", "z": "seul", "d": "Mapo", "lat": 37.557, "lng": 126.9245, "t": "Enorme, con varios pisos. El mejor para cargar la maleta de regalos baratos que igual quedan bien.", "buy": ["cables-daiso", "papeleria-kawaii", "accesorios-pelo"]},
  {"id": "s-daiso-terminal-express", "n": "Daiso Terminal Express", "k": "다이소 강남고속터미널점", "c": "conveniencia", "z": "seul", "d": "Seocho", "lat": 37.5052, "lng": 127.0045, "t": "Pegado a Goto Mall: primero la ropa, después acá las bolsas de organización para meterla en la maleta.", "buy": ["cables-daiso", "locknlock"]},
  {"id": "s-daiso-dongdaemun", "n": "Daiso Dongdaemun", "k": "다이소 동대문역사문화공원점", "c": "conveniencia", "z": "seul", "d": "Jung-gu", "lat": 37.5665, "lng": 127.008, "t": "Abre hasta tarde, que es justo lo que sirve en Dongdaemun.", "hours": "10:00–23:00", "buy": ["cables-daiso", "tijeras"]},
  {"id": "s-cu-myeongdong", "n": "CU Myeongdong", "k": "CU 명동중앙점", "c": "conveniencia", "z": "seul", "d": "Myeongdong", "lat": 37.5632, "lng": 126.9845, "t": "Tienda de conveniencia 24 horas. En Seúl hay una en cada cuadra —CU, GS25, 7-Eleven, Emart24—: este punto es apenas un ancla para ubicarte.", "hours": "24 horas", "buy": ["buldak-multi", "pepero"]},
  {"id": "s-gs25-hongdae", "n": "GS25 Hongdae", "k": "GS25 홍대입구역점", "c": "conveniencia", "z": "seul", "d": "Mapo", "lat": 37.5545, "lng": 126.9235, "t": "24 horas. Buen lugar para probar el ramyeon en la máquina de agua caliente y comprar bebidas antes de caminar.", "hours": "24 horas", "buy": ["buldak-multi"]},
  {"id": "s-emart24-estacion-de-seul", "n": "Emart24 Estación de Seúl", "k": "이마트24 서울역점", "c": "conveniencia", "z": "seul", "d": "Jung-gu", "lat": 37.5547, "lng": 126.9707, "t": "Para la última compra antes de tomar el AREX al aeropuerto.", "hours": "24 horas"},
  {"id": "s-calle-de-opticas-de-namdaemun", "n": "Calle de ópticas de Namdaemun", "k": "남대문 안경거리", "c": "opticas", "z": "seul", "d": "Jung-gu", "lat": 37.559, "lng": 126.978, "t": "La mayor concentración de ópticas mayoristas del país. Examen de vista gratis en el momento y el par completo en 20–30 minutos por ₩30.000–60.000. Llevá tu marco viejo: cambiarle los lentes sale ~$25.", "tags": ["mayorista", "efectivo"], "hours": "09:00–18:00, muchos cierran domingo", "buy": ["lentes-mayorista", "lentes-cambio"]},
  {"id": "s-davich-optica-myeongdong", "n": "Davich Óptica Myeongdong", "k": "다비치안경 명동점", "c": "opticas", "z": "seul", "d": "Myeongdong", "lat": 37.5637, "lng": 126.9835, "t": "Cadena con precio fijo, publicado, y el mismo para locales y extranjeros. Atienden en inglés. Si Namdaemun te intimida, esta es la opción tranquila.", "hours": "10:00–21:00", "buy": ["lentes-davich"]},
  {"id": "s-davich-optica-gangnam", "n": "Davich Óptica Gangnam", "k": "다비치안경 강남점", "c": "opticas", "z": "seul", "d": "Gangnam", "lat": 37.4985, "lng": 127.028, "t": "Misma cadena al sur del río. Los progresivos tardan de 3 a 7 días: si los querés, vení los primeros días del viaje, no los últimos.", "buy": ["lentes-davich"]},
  {"id": "s-opticas-de-hongdae", "n": "Ópticas de Hongdae", "k": "홍대 안경점거리", "c": "opticas", "z": "seul", "d": "Mapo", "lat": 37.555, "lng": 126.924, "t": "Marcos de diseño coreano, más caros que Namdaemun pero con mejor selección de estilo."},
  {"id": "s-mercado-gyeongdong", "n": "Mercado Gyeongdong", "k": "경동시장", "c": "ginseng", "z": "seul", "d": "Dongdaemun-gu", "lat": 37.579, "lng": 127.039, "t": "El mercado de hierbas medicinales más grande de Corea, y donde el ginseng rojo está más barato. Compará siempre el precio por sobre, no por caja.", "tags": ["mayorista", "efectivo"], "hours": "09:00–19:00, cerrado 1er y 3er domingo", "buy": ["kgc-everytime30", "ginseng-candy"]},
  {"id": "s-seoul-yangnyeongsi-mercado-de-hierbas", "n": "Seoul Yangnyeongsi (mercado de hierbas)", "k": "서울약령시", "c": "ginseng", "z": "seul", "d": "Dongdaemun-gu", "lat": 37.58, "lng": 127.04, "t": "Pegado a Gyeongdong, especializado en medicina tradicional. Tiene un museo del ginseng que explica cómo distinguir calidades.", "tags": ["mayorista"]},
  {"id": "s-jung-kwan-jang-insadong", "n": "Jung Kwan Jang Insadong", "k": "정관장 인사동점", "c": "ginseng", "z": "seul", "d": "Jongno", "lat": 37.5735, "lng": 126.9855, "t": "Tienda oficial de la marca de ginseng rojo número uno. Precio de lista, cajas selladas y garantía de que es original. El Everytime de 30 sobres cuesta ₩107.000.", "tags": ["taxfree"], "buy": ["kgc-everytime30", "kgc-everytime180", "ginseng-candy"]},
  {"id": "s-jung-kwan-jang-myeongdong", "n": "Jung Kwan Jang Myeongdong", "k": "정관장 명동점", "c": "ginseng", "z": "seul", "d": "Myeongdong", "lat": 37.564, "lng": 126.983, "t": "La misma tienda oficial, en pleno centro. El pack de 180 sobres sale 12% más barato por unidad que el de 30.", "tags": ["taxfree"], "buy": ["kgc-everytime30", "kgc-everytime180"]},
  {"id": "s-emart-yongsan", "n": "Emart Yongsan", "k": "이마트 용산점", "c": "comida", "z": "seul", "d": "Yongsan", "lat": 37.5296, "lng": 126.9648, "t": "Supermercado normal, con el precio real. Acá se compran las almendras de miel y mantequilla y el café Maxim, no en las tiendas de souvenirs de Myeongdong, que cobran el triple.", "hours": "10:00–23:00, cierra 2 domingos al mes", "buy": ["honey-almond", "maxim-mocha", "gim-set", "buldak-multi", "sesame-oil"]},
  {"id": "s-emart-seongsu", "n": "Emart Seongsu", "k": "이마트 성수점", "c": "comida", "z": "seul", "d": "Seongdong", "lat": 37.5445, "lng": 127.056, "t": "Se combina con Olive Young Seongsu en la misma tarde.", "buy": ["honey-almond", "maxim-mocha", "gochujang-tube"]},
  {"id": "s-lotte-mart-estacion-de-seul", "n": "Lotte Mart Estación de Seúl", "k": "롯데마트 서울역점", "c": "comida", "z": "seul", "d": "Jung-gu", "lat": 37.5555, "lng": 126.97, "t": "El supermercado favorito de los turistas: está sobre la estación, tiene cajas con tax refund y venden las valijas para llevarse todo. Ideal para la compra grande del final.", "tags": ["taxfree"], "hours": "10:00–24:00", "buy": ["honey-almond", "maxim-mocha", "gim-set", "buldak-multi", "yuja-cheong"]},
  {"id": "s-homeplus-yeongdeungpo", "n": "Homeplus Yeongdeungpo", "k": "홈플러스 영등포점", "c": "comida", "z": "seul", "d": "Yeongdeungpo", "lat": 37.517, "lng": 126.906, "t": "La otra cadena grande. Mismos precios que Emart, a veces mejores en packs grandes.", "buy": ["honey-almond", "maxim-mocha", "sesame-oil"]},
  {"id": "s-costco-yangjae", "n": "Costco Yangjae", "k": "코스트코 양재점", "c": "comida", "z": "seul", "d": "Seocho", "lat": 37.463, "lng": 127.038, "t": "Hace falta membresía (sirve la de Bolivia). Los packs grandes de almendras y de algas son los más baratos de la ciudad.", "tags": ["mediodia"], "buy": ["honey-almond", "gim-set"]},
  {"id": "s-mercado-tongin", "n": "Mercado Tongin", "k": "통인시장", "c": "comida", "z": "seul", "d": "Jongno", "lat": 37.58, "lng": 126.97, "t": "El mercado de las monedas: comprás fichas de latón y con eso armás tu bandeja puesto por puesto. Barato y divertido, cerca de Gyeongbokgung.", "tags": ["efectivo"], "hours": "11:00–17:00, cerrado los lunes"},
  {"id": "s-musinsa-standard-hongdae", "n": "Musinsa Standard Hongdae", "k": "무신사 스탠다드 홍대", "c": "ropa", "z": "seul", "d": "Mapo", "lat": 37.556, "lng": 126.9235, "t": "Básicos coreanos bien cortados, tipo Uniqlo pero con mejor calce. ₩20.000–50.000 por prenda. Ojo: el talle coreano corre chico, pedí una talla más.", "tags": ["taxfree"], "buy": ["musinsa-basics"]},
  {"id": "s-musinsa-standard-gangnam", "n": "Musinsa Standard Gangnam", "k": "무신사 스탠다드 강남", "c": "ropa", "z": "seul", "d": "Gangnam", "lat": 37.4985, "lng": 127.0285, "t": "La sucursal grande del sur, con probadores y devolución. Misma regla de talles.", "tags": ["taxfree"], "buy": ["musinsa-basics"]},
  {"id": "s-kolon-sport-hannam", "n": "Kolon Sport Hannam", "k": "코오롱스포츠 한남", "c": "ropa", "z": "seul", "d": "Yongsan", "lat": 37.535, "lng": 127.001, "t": "La marca outdoor coreana más establecida: calidad tipo Arc'teryx a mitad de precio. Pensado para el frío seco y el sol de altura de La Paz.", "tags": ["taxfree"], "buy": ["kolon-jacket"]},
  {"id": "s-blackyak-gangnam", "n": "Blackyak Gangnam", "k": "블랙야크 강남점", "c": "ropa", "z": "seul", "d": "Gangnam", "lat": 37.504, "lng": 127.024, "t": "Fuerte en plumas ligeras y cortavientos. Una campera de pluma sale ₩150.000–300.000, y la mitad en outlet fuera de temporada.", "tags": ["taxfree"], "buy": ["blackyak-down"]},
  {"id": "s-artbox-myeongdong", "n": "Artbox Myeongdong", "k": "아트박스 명동점", "c": "otros", "z": "seul", "d": "Myeongdong", "lat": 37.5635, "lng": 126.984, "t": "Papelería y regalos monos a ₩2.000–15.000. El lugar más eficiente para resolver quince regalos chicos de una sentada.", "buy": ["papeleria-kawaii", "monami", "accesorios-pelo"]},
  {"id": "s-kyobo-book-centre-gwanghwamun", "n": "Kyobo Book Centre Gwanghwamun", "k": "교보문고 광화문점", "c": "otros", "z": "seul", "d": "Jongno", "lat": 37.571, "lng": 126.979, "t": "La librería más grande del país, con una sección enorme de papelería y bolígrafos Monami. Buen refugio si llueve.", "hours": "09:30–22:00", "buy": ["monami", "papeleria-kawaii"]},
  {"id": "s-kakao-friends-hongdae", "n": "Kakao Friends Hongdae", "k": "카카오프렌즈 홍대점", "c": "otros", "z": "seul", "d": "Mapo", "lat": 37.5555, "lng": 126.923, "t": "Tienda oficial de los personajes de Kakao. Peluches, fundas y papelería: regalo seguro para sobrinos.", "buy": ["kakao-merch"]},
  {"id": "s-line-friends-myeongdong", "n": "Line Friends Myeongdong", "k": "라인프렌즈 명동", "c": "otros", "z": "seul", "d": "Myeongdong", "lat": 37.564, "lng": 126.9835, "t": "Lo mismo con los personajes de Line, incluida la línea de BT21 hecha con BTS.", "buy": ["kakao-merch"]},
  {"id": "s-smtown-coex-artium", "n": "SMTown COEX Artium", "k": "에스엠타운 코엑스아티움", "c": "otros", "z": "seul", "d": "Gangnam", "lat": 37.513, "lng": 127.059, "t": "Álbumes, fotocards y merch oficial de los grupos de SM. Los álbumes pesan (llevan photobook) y son frágiles: al centro de la maleta, envueltos en ropa.", "buy": ["kpop-album"]},
  {"id": "s-kwangya-seoul", "n": "KWANGYA@SEOUL", "k": "광야@서울", "c": "otros", "z": "seul", "d": "Seongdong", "lat": 37.544, "lng": 127.056, "t": "La tienda insignia de SM en Seongsu. Se combina con Olive Young Seongsu y Amore en la misma caminata.", "buy": ["kpop-album"]},
  {"id": "s-mercado-bangsan", "n": "Mercado Bangsan", "k": "방산시장", "c": "otros", "z": "seul", "d": "Jung-gu", "lat": 37.568, "lng": 127.0, "t": "Insumos de cocina y de empaque al por mayor: moldes, papel, bolsas. Si querés las tijeras de cocina coreanas o utensilios en serio, es acá.", "tags": ["mayorista"], "buy": ["tijeras", "samgyeopsal-plancha", "yangeun-nambi"]},
  {"id": "s-kiosco-de-tax-refund-de-myeongdong", "n": "Kiosco de tax refund de Myeongdong", "k": "명동 택스리펀드 키오스크", "c": "otros", "z": "seul", "d": "Myeongdong", "lat": 37.5637, "lng": 126.9845, "t": "Si un recibo pasó de ₩1.000.000 no te devuelven en caja: te dan un voucher y lo cobrás acá o en Incheon. Con pasaporte y los recibos originales.", "tags": ["taxfree"]},
  {"id": "s-aeropuerto-de-incheon-terminal-2", "n": "Aeropuerto de Incheon, Terminal 2", "k": "인천국제공항 제2여객터미널", "c": "otros", "z": "alrededores", "d": "Incheon", "lat": 37.4602, "lng": 126.4407, "t": "Korean Air, Delta, Air France y KLM salen de acá, no de la T1. Verificá la terminal en el pasaje. Llegá 3 horas antes si tenés vouchers de tax refund por cobrar.", "buy": ["kgc-royal-duty"]},
];
