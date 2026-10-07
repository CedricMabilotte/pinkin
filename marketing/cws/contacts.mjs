// Contacts entièrement fictifs pour les captures CWS.
const P = [
 ['Camille','Moreau','Lyon','12 rue Mercière, 69002 Lyon, France',45.7626,4.8331,'+33 6 00 00 01 01'],
 ['Hugo','Lefèvre','Paris','8 rue de Charonne, 75011 Paris, France',48.8534,2.3769,'+33 6 00 00 01 02'],
 ['Inès','Garnier','Paris','21 rue Lepic, 75018 Paris, France',48.8862,2.3337,'+33 6 00 00 01 03'],
 ['Lucas','Bonnet','Nantes','5 quai de la Fosse, 44000 Nantes, France',47.2105,-1.5644,'+33 6 00 00 01 04'],
 ['Manon','Roux','Bordeaux','30 cours Victor Hugo, 33000 Bordeaux, France',44.8338,-0.5713,'+33 6 00 00 01 05'],
 ['Théo','Fournier','Marseille','2 La Canebière, 13001 Marseille, France',43.2970,5.3776,'+33 6 00 00 01 06'],
 ['Léa','Girard','Toulouse','14 rue du Taur, 31000 Toulouse, France',43.6058,1.4420,'+33 6 00 00 01 07'],
 ['Nathan','Mercier','Strasbourg','3 rue des Juifs, 67000 Strasbourg, France',48.5830,7.7510,'+33 6 00 00 01 08'],
 ['Chloé','Blanc','Lille','40 rue de la Monnaie, 59800 Lille, France',50.6400,3.0620,'+33 6 00 00 01 09'],
 ['Jules','Faure','Grenoble','9 place Grenette, 38000 Grenoble, France',45.1897,5.7270,'+33 6 00 00 01 10'],
 ['Sofía','Navarro','Barcelona','Carrer de Verdi 18, 08012 Barcelona, España',41.4036,2.1574,'+34 600 000 201'],
 ['Pablo','Ortega','Madrid','Calle de Atocha 50, 28012 Madrid, España',40.4115,-3.6994,'+34 600 000 202'],
 ['Lucía','Romero','Valencia','Carrer de Cádiz 12, 46006 Valencia, España',39.4632,-0.3726,'+34 600 000 203'],
 ['Oliver','Hughes','London','14 Columbia Road, London E2 7RG, UK',51.5295,-0.0712,'+44 7700 900101'],
 ['Amelia','Price','Bristol','6 Park Street, Bristol BS1 5NF, UK',51.4545,-2.6022,'+44 7700 900102'],
 ['Lukas','Becker','Berlin','Oranienstraße 22, 10999 Berlin, Deutschland',52.5007,13.4196,'+49 1510 0000301'],
 ['Mia','Schulz','München','Gärtnerplatz 3, 80469 München, Deutschland',48.1312,11.5760,'+49 1510 0000302'],
 ['Giulia','Rossi','Torino','Via Po 20, 10124 Torino, Italia',45.0677,7.6920,'+39 320 000 0401'],
 ['Marco','Bianchi','Roma','Via del Pigneto 40, 00176 Roma, Italia',41.8881,12.5300,'+39 320 000 0402'],
 ['Emma','Peeters','Bruxelles','Rue Haute 100, 1000 Bruxelles, Belgique',50.8380,4.3480,'+32 470 00 05 01'],
 ['Noah','Janssen','Amsterdam','Prinsengracht 300, 1016 Amsterdam, Nederland',52.3700,4.8840,'+31 6 0000 0601'],
 ['Anna','Keller','Genève','Rue de Carouge 50, 1205 Genève, Suisse',46.1960,6.1430,'+41 79 000 07 01'],
 ['Rui','Almeida','Lisboa','Rua da Rosa 120, 1200 Lisboa, Portugal',38.7130,-9.1450,'+351 910 000 801'],
];
const NOADDR = [['Arthur','Lambert','+33 6 00 00 09 01'],['Zoé','Chevalier','+33 6 00 00 09 02'],['Élise','Perrin','+33 6 00 00 09 03']];
export function connections() {
  const out = P.map(([g,f,c,a,lat,lon,tel],i)=>({
    resourceName:`people/c${1000+i}`, etag:`e${i}`,
    names:[{displayName:`${g} ${f}`,givenName:g,familyName:f}],
    emailAddresses:[{value:`${g.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}.${f.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}@example.org`}],
    phoneNumbers:[{value:tel}],
    addresses:[{formattedValue:a, city:c}],
    userDefined:[{key:'GEO',value:`geo:${lat},${lon}`}],
  }));
  NOADDR.forEach(([g,f,tel],i)=>out.push({resourceName:`people/c${2000+i}`,etag:`n${i}`,
    names:[{displayName:`${g} ${f}`,givenName:g,familyName:f}],
    emailAddresses:[{value:`${g.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}@example.org`}],phoneNumbers:[{value:tel}]}));
  return out;
}
