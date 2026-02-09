export type ProductSeed = {
  category: string;
  name: string;
  description?: string;
  price: number;
  extras?: string[];
  excludes?: string[];
  image_url?: string | null;
};

const SALAD_DRESSINGS = [
  "Vinagreta miel y pistacho",
  "Vinagreta aceto balsámico",
  "Aliño tradicional",
] as const;

const PASTA_RELLENA_SHAPES = [
  "Cuore di foie",
  "Ravioli",
  "Tortellini",
  "Triangoli",
  "Panzotti",
] as const;

const PASTA_HUEVO_SHAPES = [
  "Ballerine",
  "Rigatoni",
  "Tagliatelle",
  "Fusilli",
  "Spaghetti",
] as const;

const GRILL_SAUCES = ["Salsa Fiorentina", "Salsa miel y mostaza", "Salsa trufada"] as const;

export const menuCartaSeed: ProductSeed[] = [
  // Pane e pierina
  {
    category: "Pane e pierina",
    name: "Surtido de focaccias",
    description:
      "Pan tradicional de la cocina italiana. Cuatro variedades: focaccia con aceite, focaccia con cebolla, focaccia con aceitunas y focaccia con tomate.",
    price: 4.85,
  },
  {
    category: "Pane e pierina",
    name: "Pierina Parmigiana",
    description: "Base de pizza con queso parmigiano.",
    price: 5.15,
  },
  {
    category: "Pane e pierina",
    name: "Pierina Tartufata",
    description: "Base de pizza con trufa negra.",
    price: 5.55,
  },
  {
    category: "Pane e pierina",
    name: "Pierina Mista",
    description: "Base de pizza con trufa negra y queso parmigiano.",
    price: 5.35,
  },

  // Entrantes
  {
    category: "Entrantes",
    name: "Cazoleta de alcachofas y foie de pato",
    description:
      "Centro de alcachofas en aceite con foie de pato caramelizado, huevo poché, tomate aliñado y beicon crujiente.",
    price: 14.2,
  },
  {
    category: "Entrantes",
    name: "Croquetas de la abuela (8 uds.)",
    description: "Mix de croquetas caseras de jamón ibérico y de pollo asado.",
    price: 11.85,
  },
  {
    category: "Entrantes",
    name: "Involtini freddo di crêpe",
    description:
      "Crêpe relleno de salmón ahumado, aguacate, cebolla, rulo de cabra y tomate, aderezado con pesto.",
    price: 13.95,
  },
  {
    category: "Entrantes",
    name: "Carpaccio de ternera",
    description:
      "Solomillo de ternera en lonchas finas con sal, pimienta, limón y aceite de oliva virgen extra; acompañado con queso parmigiano D.O.P. de 24 meses.",
    price: 17.75,
  },
  {
    category: "Entrantes",
    name: "Burrata della Puglia",
    description: "Burrata con mermelada de tomate, pesto, rúcula y piñones tostados.",
    price: 14.55,
  },

  // Ensaladas
  {
    category: "Ensaladas",
    name: "Giulietta",
    description:
      "Lechuga romana y cogollos con tomate aliñado, cecina, beicon crujiente y perlas de rulo de cabra rellenas de mango.",
    price: 14.55,
    extras: [...SALAD_DRESSINGS],
  },
  {
    category: "Ensaladas",
    name: "Paese",
    description:
      "Lechuga romana y cogollos con canónigos y rúcula, beicon crujiente, rulo de cabra rebozado con pistachos, manzana, tomate aliñado, nueces y mermelada de tomate.",
    price: 14.55,
    extras: [...SALAD_DRESSINGS],
  },
  {
    category: "Ensaladas",
    name: "Pollo crocante",
    description:
      "Lechuga romana y cogollos con canónigos y rúcula, tomate aliñado, pollo crujiente, manzana, pimiento rojo asado y aguacate.",
    price: 14.55,
    extras: [...SALAD_DRESSINGS],
  },
  {
    category: "Ensaladas",
    name: "Il nostro Bowl",
    description:
      "Juliana de lechuga romana y cogollos, alcachofas en aceite, tomate aliñado, perlas de rulo de cabra rellenas de mango, aguacate y pollo crujiente con salsa teriyaki.",
    price: 14.55,
    extras: [...SALAD_DRESSINGS],
  },
  {
    category: "Ensaladas",
    name: "Lungo mare",
    description:
      "Variado de lechugas, tomate aliñado, atún, gambas, rollitos de salmón ahumado con picadillo de cangrejo, alcachofas en aceite y pimiento rojo asado.",
    price: 14.55,
    extras: [...SALAD_DRESSINGS],
  },

  // Gratinados
  {
    category: "Gratinados",
    name: "Gran cannelloni",
    description:
      "Canelones de pueblo con asado tradicional, pasta fresca, bechamel y queso parmigiano.",
    price: 18.6,
  },
  {
    category: "Gratinados",
    name: "Cannelloni di mare",
    description:
      "Rellenos con brandada de bacalao y gambas picadas en pasta a la tinta de calamar, bechamel de pimiento del piquillo y queso parmigiano.",
    price: 18.1,
  },
  {
    category: "Gratinados",
    name: "Lasagna di spinaci e gamberi",
    description:
      "Cinco láminas de pasta rellenas de espinacas y gambas a la crema, bechamel de pimiento del piquillo y queso parmigiano.",
    price: 18.6,
  },
  {
    category: "Gratinados",
    name: "Lasagna a la Bolognese",
    description:
      "Cinco láminas de pasta con salsa boloñesa, huevo rallado y espinacas, bechamel y queso parmigiano.",
    price: 18.95,
  },
  {
    category: "Gratinados",
    name: "Misto del Tesorero",
    description:
      "Lasagna di Bologna, cannellone y rigatoni a la salsa Pepe, gratinados con queso parmigiano.",
    price: 20.25,
  },

  // Risotto
  {
    category: "Risotto",
    name: "Montera",
    description: "Crema de mascarpone con meloso de ternera cocinada en su jugo a baja temperatura.",
    price: 17.7,
  },
  {
    category: "Risotto",
    name: "Tartufo d'Alba",
    description: "Risotto muy cremoso a la trufa negra y queso parmigiano.",
    price: 17.7,
  },
  {
    category: "Risotto",
    name: "Nero di seppia",
    description: "Risotto de sepia en su tinta con picado de gambas y pulpitos a la crema.",
    price: 18.75,
  },
  {
    category: "Risotto",
    name: "Piemonte",
    description: "Risotto de funghi porcini y setas del bosque a la crema con queso parmigiano.",
    price: 18.55,
  },

  // Pasta fresca rellena
  {
    category: "Pasta fresca rellena",
    name: "Foie y trufa (rellena)",
    description: "Fina crema de foie de pato y trufa negra.",
    price: 16.6,
    extras: [...PASTA_RELLENA_SHAPES],
  },
  {
    category: "Pasta fresca rellena",
    name: "Ligurian (rellena)",
    description: "Pesto a la crema con beicon y queso parmigiano de 24 meses.",
    price: 16.15,
    extras: [...PASTA_RELLENA_SHAPES],
  },
  {
    category: "Pasta fresca rellena",
    name: "Casalinga (rellena)",
    description: "Crema de mascarpone con champiñones y longaniza al horno con piñones tostados.",
    price: 16.15,
    extras: [...PASTA_RELLENA_SHAPES],
  },
  {
    category: "Pasta fresca rellena",
    name: "Champi almendras (rellena)",
    description: "Champiñones a la crema con crocanti de almendras.",
    price: 16.15,
    extras: [...PASTA_RELLENA_SHAPES],
  },
  {
    category: "Pasta fresca rellena",
    name: "Trufa y hongos (rellena)",
    description: "Crema de funghi porcini y trufa con salteado de setas.",
    price: 16.15,
    extras: [...PASTA_RELLENA_SHAPES],
  },
  {
    category: "Pasta fresca rellena",
    name: "Carbonara (rellena)",
    description: "Al mio modo. ¡Como siempre!",
    price: 16.15,
    extras: [...PASTA_RELLENA_SHAPES],
  },
  {
    category: "Pasta fresca rellena",
    name: "Pesto genovese (rellena)",
    description: "Salsa de albahaca con piñones, parmigiano y aceite de oliva virgen extra.",
    price: 16.15,
    extras: [...PASTA_RELLENA_SHAPES],
  },
  {
    category: "Pasta fresca rellena",
    name: "Cinque formaggi (rellena)",
    description: "Suave crema de parmigiano, emmental, gruyère, gorgonzola y ricotta.",
    price: 16.15,
    extras: [...PASTA_RELLENA_SHAPES],
  },
  {
    category: "Pasta fresca rellena",
    name: "Arrabbiata (rellena)",
    description: "Salsa roja ligeramente picante con sobrasada de Mallorca D.O.P.",
    price: 16.15,
    extras: [...PASTA_RELLENA_SHAPES],
  },
  {
    category: "Pasta fresca rellena",
    name: "Bolognese (rellena)",
    description: "Elaborada al estilo de Bologna. ¡Como manda la tradición!",
    price: 15.95,
    extras: [...PASTA_RELLENA_SHAPES],
  },
  {
    category: "Pasta fresca rellena",
    name: "Trufa y parmigiano (rellena)",
    description: "Crema melosa de trufa y queso parmigiano de 24 meses.",
    price: 16.6,
    extras: [...PASTA_RELLENA_SHAPES],
  },

  // Pasta fresca al huevo
  {
    category: "Pasta fresca al huevo",
    name: "Ligurian (al huevo)",
    description: "Pesto a la crema con beicon y parmigiano de 24 meses.",
    price: 14.6,
    extras: [...PASTA_HUEVO_SHAPES],
  },
  {
    category: "Pasta fresca al huevo",
    name: "Trufa y hongos (al huevo)",
    description: "Crema de funghi porcini y trufa con salteado de setas.",
    price: 14.6,
    extras: [...PASTA_HUEVO_SHAPES],
  },
  {
    category: "Pasta fresca al huevo",
    name: "Arrabbiata (al huevo)",
    description: "Salsa roja ligeramente picante con sobrasada de Mallorca D.O.P.",
    price: 14.6,
    extras: [...PASTA_HUEVO_SHAPES],
  },
  {
    category: "Pasta fresca al huevo",
    name: "Casalinga (al huevo)",
    description: "Crema de mascarpone con champiñones y longaniza al horno con piñones tostados.",
    price: 14.6,
    extras: [...PASTA_HUEVO_SHAPES],
  },
  {
    category: "Pasta fresca al huevo",
    name: "Champi almendras (al huevo)",
    description: "Champiñones a la crema con crocanti de almendras.",
    price: 14.6,
    extras: [...PASTA_HUEVO_SHAPES],
  },
  {
    category: "Pasta fresca al huevo",
    name: "Carbonara (al huevo)",
    description: "Al mio modo. ¡Como siempre!",
    price: 14.6,
    extras: [...PASTA_HUEVO_SHAPES],
  },
  {
    category: "Pasta fresca al huevo",
    name: "Bolognese (al huevo)",
    description: "Cocinada al estilo de Bologna. ¡Como manda la tradición!",
    price: 14.4,
    extras: [...PASTA_HUEVO_SHAPES],
  },
  {
    category: "Pasta fresca al huevo",
    name: "Pesto genovese (al huevo)",
    description: "Salsa de albahaca con piñones, parmigiano y aceite de oliva virgen extra.",
    price: 14.6,
    extras: [...PASTA_HUEVO_SHAPES],
  },
  {
    category: "Pasta fresca al huevo",
    name: "Aglio olio e peperoncino (al huevo)",
    description: "Ajo, aceite de oliva virgen extra, guindillas y gambas, suavemente picante.",
    price: 14.45,
    extras: [...PASTA_HUEVO_SHAPES],
  },
  {
    category: "Pasta fresca al huevo",
    name: "Nero di seppia (al huevo)",
    description: "Sepia en su tinta con picado de gambas y pulpitos a la crema.",
    price: 17.95,
    extras: [...PASTA_HUEVO_SHAPES],
  },
  {
    category: "Pasta fresca al huevo",
    name: "Trufa y parmigiano (al huevo)",
    description: "Crema melosa de trufa y queso parmigiano de 24 meses.",
    price: 15.05,
    extras: [...PASTA_HUEVO_SHAPES],
  },

  // Del mare
  {
    category: "Del mare",
    name: "Atún rojo salvaje",
    description:
      "Lomo de atún rojo salvaje a la miel y mostaza, con alcachofas en aceite, tomate aliñado y maíz dulce.",
    price: 24.35,
  },
  {
    category: "Del mare",
    name: "Tartar de atún rojo salvaje",
    description:
      "Atún rojo salvaje con miel y mostaza sobre aguacate, acompañado de berenjena rebozada y tomate aliñado.",
    price: 20.4,
  },
  {
    category: "Del mare",
    name: "Pata de pulpo a la parrilla",
    description:
      "Pulpo sobre semipuré de patata al pimentón de La Vera y aceite picual con pimientos del Padrón.",
    price: 24.55,
  },
  {
    category: "Del mare",
    name: "Spaghetti Vongole",
    description: "Almejas salteadas en su jugo con fumé al vino blanco, ajo y perejil.",
    price: 20.4,
  },
  {
    category: "Del mare",
    name: "Tagliatelle al Frutti di mare",
    description:
      "Pasta fresca con sepia, calamarcitos, almejas, mejillones y gambas langostineras en salsa de marisco.",
    price: 20.4,
  },
  {
    category: "Del mare",
    name: "Spaghetti en carroza",
    description:
      "Salsa de marisco con calamarcitos, almejas, mejillones y gambas langostineras cubierta con base de pizza y gratinada.",
    price: 20.4,
  },

  // Burgers y horno
  {
    category: "Burgers y horno",
    name: "Maxi burguer",
    description:
      "Hamburguesa de ternera Angus con foie de pato, beicon crujiente, queso scamorza ahumado y cebolla caramelizada. Con patatas fritas y salsa mesone.",
    price: 20.05,
  },
  {
    category: "Burgers y horno",
    name: "Cartoccio",
    description:
      "Hamburguesa de ternera Angus envuelta en masa de pizza y horneada, con beicon crujiente, queso scamorza, patatas fritas y salsa mesone.",
    price: 18.65,
  },
  {
    category: "Burgers y horno",
    name: "Lomo al Pepe",
    description:
      "Lomo al Pepe con rigatoni fresco a la salsa Pepe, patatas fritas, jugo de pollo y salsa mesone.",
    price: 19.65,
  },

  // Carnes a baja temperatura
  {
    category: "Carnes a baja temperatura",
    name: "Pollo al horno",
    description: "Medio pollo cocinado en su jugo con patatas fritas, jugo de pollo y salsa mesone.",
    price: 17.35,
  },
  {
    category: "Carnes a baja temperatura",
    name: "Paletilla de cordero tierno",
    description:
      "Paletilla con semipuré de patata al pimentón de La Vera, aceite picual y pimientos del Padrón.",
    price: 24.55,
  },
  {
    category: "Carnes a baja temperatura",
    name: "Brazuelo de cordero tierno",
    description:
      "Brazuelo con semipuré de patata al pimentón de La Vera, aceite picual y pimientos del Padrón.",
    price: 25.15,
  },

  // Carnes a la parrilla
  {
    category: "Carnes a la parrilla",
    name: "Entrecot de ternera Angus (a la parrilla)",
    description: "Entrecot de ternera Angus con guarnición.",
    price: 25.05,
  },
  {
    category: "Carnes a la parrilla",
    name: "Entrecot de ternera Angus (con salsa)",
    description: "Entrecot de ternera Angus con guarnición y salsa a elegir.",
    price: 27.15,
    extras: [...GRILL_SAUCES],
  },
  {
    category: "Carnes a la parrilla",
    name: "Solomillo de ternera Angus (a la parrilla)",
    description: "Solomillo de ternera Angus con guarnición.",
    price: 27.65,
  },
  {
    category: "Carnes a la parrilla",
    name: "Solomillo de ternera Angus (con salsa)",
    description: "Solomillo de ternera Angus con guarnición y salsa a elegir.",
    price: 29.75,
    extras: [...GRILL_SAUCES],
  },
  {
    category: "Carnes a la parrilla",
    name: "Maxibrocheta de solomillo ibérico",
    description: "Maxibrocheta de solomillo ibérico y verduras a la brasa con salsa Fiorentina.",
    price: 23.7,
  },

  // Pizzas clásicas
  {
    category: "Pizzas clásicas",
    name: "Prosciutto",
    description: "Tomate, mozzarella y jamón de York.",
    price: 16.35,
  },
  {
    category: "Pizzas clásicas",
    name: "Pepperoni",
    description: "Tomate, mozzarella, pepperoni y beicon crujiente.",
    price: 16.55,
  },
  {
    category: "Pizzas clásicas",
    name: "Quattro stagioni",
    description: "Tomate, mozzarella, jamón de York, champiñones, atún y alcachofas en aceite.",
    price: 16.75,
  },
  {
    category: "Pizzas clásicas",
    name: "Bismarck",
    description: "Tomate, mozzarella, jamón de York y huevo poché.",
    price: 16.55,
  },
  {
    category: "Pizzas clásicas",
    name: "Cinco quesos",
    description: "Tomate, mozzarella, emmental, gruyère, parmigiano y gorgonzola.",
    price: 16.75,
  },
  {
    category: "Pizzas clásicas",
    name: "Tonno e salmone",
    description: "Tomate, mozzarella, atún y salmón.",
    price: 17.05,
  },
  {
    category: "Pizzas clásicas",
    name: "Capri",
    description: "Tomate, mozzarella, atún y champiñones.",
    price: 16.75,
  },

  // Pizzas de la casa
  {
    category: "Pizzas de la casa",
    name: "DOMUS",
    description: "Tomate, burrata, parmigiano, carpaccio de solomillo de ternera y rúcula.",
    price: 17.05,
  },
  {
    category: "Pizzas de la casa",
    name: "Parmigiana",
    description: "Tomate, mozzarella, beicon crujiente, queso scamorza ahumado y parmigiano.",
    price: 16.75,
  },
  {
    category: "Pizzas de la casa",
    name: "Dell' Emilia",
    description: "Tomate, mozzarella, emmental, gruyère, parmigiano, gorgonzola, beicon crujiente y cebolla caramelizada.",
    price: 17.05,
  },
  {
    category: "Pizzas de la casa",
    name: "Diavola",
    description: "Tomate, mozzarella, base de ternera, pepperoni, longaniza y guindilla, ligeramente picante.",
    price: 16.75,
  },
  {
    category: "Pizzas de la casa",
    name: "Melanzana",
    description: "Tomate, mozzarella, berenjena rebozada, parmigiano, rulo de cabra, miel y aceto balsámico.",
    price: 16.75,
  },
  {
    category: "Pizzas de la casa",
    name: "Calzone",
    description: "Tomate, mozzarella, huevo poché, jamón de York, pimiento rojo, cebolla y tabasco.",
    price: 17.25,
  },
  {
    category: "Pizzas de la casa",
    name: "Almadraba",
    description: "Tomate, mozzarella, atún rojo salvaje y aguacate.",
    price: 17.25,
  },
  {
    category: "Pizzas de la casa",
    name: "Pizzaiolo",
    description: "Tomate, burrata, aguacate, pesto y canónigos.",
    price: 16.75,
  },

  // Pizzas Piccolinas
  {
    category: "Pizzas Piccolinas",
    name: "Prosciutto (Piccolina)",
    description: "Versión pequeña de pizza Prosciutto.",
    price: 12.25,
  },
  {
    category: "Pizzas Piccolinas",
    name: "Pepperoni (Piccolina)",
    description: "Versión pequeña de pizza Pepperoni.",
    price: 12.25,
  },
  {
    category: "Pizzas Piccolinas",
    name: "Bismarck (Piccolina)",
    description: "Versión pequeña de pizza Bismarck.",
    price: 12.25,
  },

  // Vinos y bebidas
  {
    category: "Vinos y bebidas",
    name: "Vino de la casa tinto",
    description: "Botella 75 cl.",
    price: 12.5,
  },
  {
    category: "Vinos y bebidas",
    name: "Vino de la casa rosado",
    description: "Botella 75 cl.",
    price: 12.5,
  },
  {
    category: "Vinos y bebidas",
    name: "Vino de la casa blanco",
    description: "Botella 75 cl.",
    price: 12.5,
  },
  {
    category: "Vinos y bebidas",
    name: "Lambrusco Rosato (IGT Reggio Emilia)",
    price: 13.95,
  },
  {
    category: "Vinos y bebidas",
    name: "Lambrusco Rosso (IGT Reggio Emilia)",
    price: 13.95,
  },
  {
    category: "Vinos y bebidas",
    name: "Moscato d'Asti (D.O.C.G. Asti Bianco)",
    price: 16.8,
  },
  {
    category: "Vinos y bebidas",
    name: "Chianti (D.O.C.G.)",
    price: 17.65,
  },
  {
    category: "Vinos y bebidas",
    name: "Copa de vino de la casa",
    description: "Tinto, rosado o blanco.",
    price: 3.25,
  },
  {
    category: "Vinos y bebidas",
    name: "Copa de Viña Ijalba (tinto crianza)",
    price: 4.05,
  },
  {
    category: "Vinos y bebidas",
    name: "Copa de Glárima de Sommos",
    description: "Tinto o blanco D.O. Somontano.",
    price: 3.85,
  },
  {
    category: "Vinos y bebidas",
    name: "Viña Ijalba (D.O. Rioja · Tinto crianza)",
    price: 18.7,
  },
  {
    category: "Vinos y bebidas",
    name: "Muga (D.O. Rioja · Tinto crianza)",
    price: 26.15,
  },
  {
    category: "Vinos y bebidas",
    name: "Luis Cañas (D.O. Rioja · Tinto crianza)",
    price: 21.95,
  },
  {
    category: "Vinos y bebidas",
    name: "Asomo Figuero (D.O. Ribera del Duero · Tinto)",
    price: 21.95,
  },
  {
    category: "Vinos y bebidas",
    name: "Emilio Moro (D.O. Ribera del Duero · Tinto)",
    price: 26.25,
  },
  {
    category: "Vinos y bebidas",
    name: "Glárima de Sommos (D.O. Somontano · Tinto)",
    price: 13.75,
  },
  {
    category: "Vinos y bebidas",
    name: "Glárima de Sommos (D.O. Somontano · Blanco)",
    price: 13.75,
  },
  {
    category: "Vinos y bebidas",
    name: "Honeymoon (D.O. Penedès · Blanco)",
    price: 17.55,
  },
  {
    category: "Vinos y bebidas",
    name: "Cuarenta Vendimias (D.O. Rueda · Verdejo)",
    price: 18.7,
  },
  {
    category: "Vinos y bebidas",
    name: "José Pariente (D.O. Rueda · Verdejo)",
    price: 20.9,
  },
  {
    category: "Vinos y bebidas",
    name: "Pedregosa Gran Cuvée (D.O. Cava · Reserva Brut Nature)",
    price: 20.85,
  },
  {
    category: "Vinos y bebidas",
    name: "Sangría de vino (1 L)",
    price: 16.95,
  },
  {
    category: "Vinos y bebidas",
    name: "Sangría de cava (1 L)",
    price: 17.95,
  },
  {
    category: "Vinos y bebidas",
    name: "Sangría de moscato (1 L)",
    price: 17.95,
  },
];
