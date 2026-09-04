/* GLOSSA · PERÍCOPAS
 *
 * Las divisiones del texto: dónde empieza y dónde acaba cada escena. Son
 * EDITORIALES y no de ninguna traducción, y ésa es la propiedad que las hace
 * encajar aquí: esta aplicación ya pagina sincronizado —cada hoja se corta
 * donde quepa en las cuatro versiones, para que la hoja 7 traiga los mismos
 * versículos en todas— así que una división que tampoco depende de la versión
 * cae en el mismo molde sin pelearse con nada.
 *
 * LOS TÍTULOS SON PROPIOS, cortos y neutrales. No se copian de los encabezados
 * de ninguna Biblia: ésos son de quien la editó. Quien añada libros aquí tiene
 * que escribirlos, no traerlos.
 *
 * EL LIBRO VA EN EL CÓDIGO DE LA CASA —LUK, no Luke—. El documento que trajo
 * estos datos usaba el nombre en inglés, y eso obligaba a una tabla entre dos
 * vocabularios que se desincroniza el día que alguien añada un libro. Con el
 * código de siempre no hay tabla que mantener.
 *
 * Y SON DE SOLO LECTURA. Las cintas y las piedras son del lector; las
 * perícopas son del libro. No hay ni habrá manera de crearlas desde la
 * aplicación.
 *
 * El formato de cada una: [capítulo, versículo] de inicio y de fin, ambos
 * incluidos, y un id estable —libro, capítulo, versículo inicial y final, a
 * tres cifras— que no cambia aunque se retoque el título.
 *
 * Para añadir un libro: otra lista, y su código como clave de PERICOPAS.
 */
(function (raiz) {
  'use strict';

  const LUCAS = [
    { id:'luke-001-001-004', ini:[1,1], fin:[1,4], t:{ es:'Prólogo', en:'Prologue' } },
    { id:'luke-001-005-025', ini:[1,5], fin:[1,25], t:{ es:'Anuncio del nacimiento de Juan', en:'The announcement of John’s birth' } },
    { id:'luke-001-026-038', ini:[1,26], fin:[1,38], t:{ es:'Anuncio del nacimiento de Jesús', en:'The announcement of Jesus’ birth' } },
    { id:'luke-001-039-056', ini:[1,39], fin:[1,56], t:{ es:'María visita a Elisabet', en:'Mary visits Elizabeth' } },
    { id:'luke-001-057-080', ini:[1,57], fin:[1,80], t:{ es:'Nacimiento de Juan y cántico de Zacarías', en:'John’s birth and Zechariah’s song' } },
    { id:'luke-002-001-020', ini:[2,1], fin:[2,20], t:{ es:'Nacimiento de Jesús', en:'The birth of Jesus' } },
    { id:'luke-002-021-040', ini:[2,21], fin:[2,40], t:{ es:'Jesús es presentado en el templo', en:'Jesus is presented at the temple' } },
    { id:'luke-002-041-052', ini:[2,41], fin:[2,52], t:{ es:'Jesús niño en el templo', en:'The boy Jesus at the temple' } },
    { id:'luke-003-001-020', ini:[3,1], fin:[3,20], t:{ es:'Ministerio de Juan el Bautista', en:'John the Baptist’s ministry' } },
    { id:'luke-003-021-022', ini:[3,21], fin:[3,22], t:{ es:'Bautismo de Jesús', en:'Jesus’ baptism' } },
    { id:'luke-003-023-038', ini:[3,23], fin:[3,38], t:{ es:'Genealogía de Jesús', en:'Jesus’ genealogy' } },
    { id:'luke-004-001-013', ini:[4,1], fin:[4,13], t:{ es:'Jesús es probado en el desierto', en:'Jesus is tested in the wilderness' } },
    { id:'luke-004-014-030', ini:[4,14], fin:[4,30], t:{ es:'Jesús en Nazaret', en:'Jesus at Nazareth' } },
    { id:'luke-004-031-037', ini:[4,31], fin:[4,37], t:{ es:'Jesús enseña y libera en Capernaúm', en:'Jesus teaches and frees a man in Capernaum' } },
    { id:'luke-004-038-044', ini:[4,38], fin:[4,44], t:{ es:'Sanidades y predicación en Galilea', en:'Healings and preaching in Galilee' } },
    { id:'luke-005-001-011', ini:[5,1], fin:[5,11], t:{ es:'Llamamiento de los primeros discípulos', en:'The call of the first disciples' } },
    { id:'luke-005-012-016', ini:[5,12], fin:[5,16], t:{ es:'Sanidad de un hombre con lepra', en:'Healing a man with leprosy' } },
    { id:'luke-005-017-026', ini:[5,17], fin:[5,26], t:{ es:'Sanidad de un hombre paralizado', en:'Healing a paralyzed man' } },
    { id:'luke-005-027-032', ini:[5,27], fin:[5,32], t:{ es:'Llamamiento de Leví', en:'The call of Levi' } },
    { id:'luke-005-033-039', ini:[5,33], fin:[5,39], t:{ es:'Pregunta sobre el ayuno', en:'A question about fasting' } },
    { id:'luke-006-001-011', ini:[6,1], fin:[6,11], t:{ es:'El sábado y las obras de misericordia', en:'The Sabbath and works of mercy' } },
    { id:'luke-006-012-016', ini:[6,12], fin:[6,16], t:{ es:'Elección de los doce', en:'The choice of the twelve' } },
    { id:'luke-006-017-026', ini:[6,17], fin:[6,26], t:{ es:'Bienaventuranzas y advertencias', en:'Blessings and warnings' } },
    { id:'luke-006-027-036', ini:[6,27], fin:[6,36], t:{ es:'El amor a los enemigos', en:'Love for enemies' } },
    { id:'luke-006-037-049', ini:[6,37], fin:[6,49], t:{ es:'Juicio, fruto y fundamento', en:'Judgment, fruit, and foundation' } },
    { id:'luke-007-001-010', ini:[7,1], fin:[7,10], t:{ es:'Sanidad del siervo de un centurión', en:'Healing a centurion’s servant' } },
    { id:'luke-007-011-017', ini:[7,11], fin:[7,17], t:{ es:'Jesús devuelve la vida al hijo de una viuda', en:'Jesus restores a widow’s son to life' } },
    { id:'luke-007-018-035', ini:[7,18], fin:[7,35], t:{ es:'Jesús y Juan el Bautista', en:'Jesus and John the Baptist' } },
    { id:'luke-007-036-050', ini:[7,36], fin:[7,50], t:{ es:'Una mujer unge a Jesús', en:'A woman anoints Jesus' } },
    { id:'luke-008-001-003', ini:[8,1], fin:[8,3], t:{ es:'Mujeres que acompañan a Jesús', en:'Women who accompany Jesus' } },
    { id:'luke-008-004-015', ini:[8,4], fin:[8,15], t:{ es:'Parábola del sembrador', en:'The parable of the sower' } },
    { id:'luke-008-016-021', ini:[8,16], fin:[8,21], t:{ es:'La lámpara y la familia de Jesús', en:'The lamp and Jesus’ family' } },
    { id:'luke-008-022-025', ini:[8,22], fin:[8,25], t:{ es:'Jesús calma una tormenta', en:'Jesus calms a storm' } },
    { id:'luke-008-026-039', ini:[8,26], fin:[8,39], t:{ es:'Liberación de un hombre entre los sepulcros', en:'Freedom for a man among the tombs' } },
    { id:'luke-008-040-056', ini:[8,40], fin:[8,56], t:{ es:'La hija de Jairo y una mujer enferma', en:'Jairus’s daughter and a suffering woman' } },
    { id:'luke-009-001-006', ini:[9,1], fin:[9,6], t:{ es:'Misión de los doce', en:'The mission of the twelve' } },
    { id:'luke-009-007-009', ini:[9,7], fin:[9,9], t:{ es:'Herodes oye acerca de Jesús', en:'Herod hears about Jesus' } },
    { id:'luke-009-010-017', ini:[9,10], fin:[9,17], t:{ es:'Alimentación de una multitud', en:'Feeding a crowd' } },
    { id:'luke-009-018-027', ini:[9,18], fin:[9,27], t:{ es:'La identidad de Jesús y el camino del discípulo', en:'Jesus’ identity and the disciple’s path' } },
    { id:'luke-009-028-036', ini:[9,28], fin:[9,36], t:{ es:'Transfiguración de Jesús', en:'Jesus’ transfiguration' } },
    { id:'luke-009-037-045', ini:[9,37], fin:[9,45], t:{ es:'Sanidad de un muchacho y anuncio del sufrimiento', en:'Healing a boy and foretelling suffering' } },
    { id:'luke-009-046-050', ini:[9,46], fin:[9,50], t:{ es:'Grandeza y servicio', en:'Greatness and service' } },
    { id:'luke-009-051-062', ini:[9,51], fin:[9,62], t:{ es:'El camino hacia Jerusalén', en:'The journey toward Jerusalem' } },
    { id:'luke-010-001-024', ini:[10,1], fin:[10,24], t:{ es:'Misión de los setenta y dos', en:'The mission of the seventy-two' } },
    { id:'luke-010-025-037', ini:[10,25], fin:[10,37], t:{ es:'El buen samaritano', en:'The good Samaritan' } },
    { id:'luke-010-038-042', ini:[10,38], fin:[10,42], t:{ es:'Marta y María', en:'Martha and Mary' } },
    { id:'luke-011-001-013', ini:[11,1], fin:[11,13], t:{ es:'Jesús enseña a orar', en:'Jesus teaches about prayer' } },
    { id:'luke-011-014-026', ini:[11,14], fin:[11,26], t:{ es:'Jesús y el poder del mal', en:'Jesus and the power of evil' } },
    { id:'luke-011-027-036', ini:[11,27], fin:[11,36], t:{ es:'Escuchar la palabra y vivir en la luz', en:'Hearing the word and living in the light' } },
    { id:'luke-011-037-054', ini:[11,37], fin:[11,54], t:{ es:'Advertencias a dirigentes religiosos', en:'Warnings to religious leaders' } },
    { id:'luke-012-001-012', ini:[12,1], fin:[12,12], t:{ es:'Integridad y confianza ante la oposición', en:'Integrity and trust under opposition' } },
    { id:'luke-012-013-034', ini:[12,13], fin:[12,34], t:{ es:'Riqueza, afán y tesoro', en:'Wealth, anxiety, and treasure' } },
    { id:'luke-012-035-048', ini:[12,35], fin:[12,48], t:{ es:'Vigilancia y fidelidad', en:'Watchfulness and faithfulness' } },
    { id:'luke-012-049-059', ini:[12,49], fin:[12,59], t:{ es:'Decisión y discernimiento', en:'Decision and discernment' } },
    { id:'luke-013-001-009', ini:[13,1], fin:[13,9], t:{ es:'Arrepentimiento y fruto', en:'Repentance and fruit' } },
    { id:'luke-013-010-017', ini:[13,10], fin:[13,17], t:{ es:'Sanidad en sábado', en:'Healing on the Sabbath' } },
    { id:'luke-013-018-021', ini:[13,18], fin:[13,21], t:{ es:'El reino como semilla y levadura', en:'The kingdom as seed and leaven' } },
    { id:'luke-013-022-030', ini:[13,22], fin:[13,30], t:{ es:'La puerta estrecha', en:'The narrow door' } },
    { id:'luke-013-031-035', ini:[13,31], fin:[13,35], t:{ es:'Jesús se lamenta por Jerusalén', en:'Jesus grieves over Jerusalem' } },
    { id:'luke-014-001-014', ini:[14,1], fin:[14,14], t:{ es:'Humildad y hospitalidad', en:'Humility and hospitality' } },
    { id:'luke-014-015-024', ini:[14,15], fin:[14,24], t:{ es:'La gran cena', en:'The great banquet' } },
    { id:'luke-014-025-035', ini:[14,25], fin:[14,35], t:{ es:'El costo de seguir a Jesús', en:'The cost of following Jesus' } },
    { id:'luke-015-001-032', ini:[15,1], fin:[15,32], t:{ es:'Parábolas de lo perdido y encontrado', en:'Parables of what was lost and found' } },
    { id:'luke-016-001-013', ini:[16,1], fin:[16,13], t:{ es:'El administrador y la fidelidad', en:'The manager and faithfulness' } },
    { id:'luke-016-014-018', ini:[16,14], fin:[16,18], t:{ es:'La ley, el reino y la fidelidad', en:'The law, the kingdom, and faithfulness' } },
    { id:'luke-016-019-031', ini:[16,19], fin:[16,31], t:{ es:'El rico y Lázaro', en:'The rich man and Lazarus' } },
    { id:'luke-017-001-010', ini:[17,1], fin:[17,10], t:{ es:'Tropiezos, perdón y servicio', en:'Stumbling, forgiveness, and service' } },
    { id:'luke-017-011-019', ini:[17,11], fin:[17,19], t:{ es:'Diez personas son sanadas', en:'Ten people are healed' } },
    { id:'luke-017-020-037', ini:[17,20], fin:[17,37], t:{ es:'La llegada del reino', en:'The coming of the kingdom' } },
    { id:'luke-018-001-014', ini:[18,1], fin:[18,14], t:{ es:'Parábolas sobre la oración y la humildad', en:'Parables about prayer and humility' } },
    { id:'luke-018-015-030', ini:[18,15], fin:[18,30], t:{ es:'Recibir el reino y renunciar a las riquezas', en:'Receiving the kingdom and leaving wealth behind' } },
    { id:'luke-018-031-034', ini:[18,31], fin:[18,34], t:{ es:'Jesús anuncia su muerte y resurrección', en:'Jesus foretells his death and resurrection' } },
    { id:'luke-018-035-043', ini:[18,35], fin:[18,43], t:{ es:'Sanidad de un hombre ciego cerca de Jericó', en:'Healing a blind man near Jericho' } },
    { id:'luke-019-001-010', ini:[19,1], fin:[19,10], t:{ es:'Jesús y Zaqueo', en:'Jesus and Zacchaeus' } },
    { id:'luke-019-011-027', ini:[19,11], fin:[19,27], t:{ es:'Parábola de las minas', en:'The parable of the minas' } },
    { id:'luke-019-028-044', ini:[19,28], fin:[19,44], t:{ es:'Entrada en Jerusalén', en:'Entry into Jerusalem' } },
    { id:'luke-019-045-048', ini:[19,45], fin:[19,48], t:{ es:'Jesús en el templo', en:'Jesus at the temple' } },
    { id:'luke-020-001-026', ini:[20,1], fin:[20,26], t:{ es:'La autoridad de Jesús es cuestionada', en:'Jesus’ authority is questioned' } },
    { id:'luke-020-027-040', ini:[20,27], fin:[20,40], t:{ es:'Pregunta acerca de la resurrección', en:'A question about the resurrection' } },
    { id:'luke-020-041-047', ini:[20,41], fin:[20,47], t:{ es:'El Mesías y los escribas', en:'The Messiah and the scribes' } },
    { id:'luke-021-001-004', ini:[21,1], fin:[21,4], t:{ es:'La ofrenda de una viuda', en:'A widow’s offering' } },
    { id:'luke-021-005-038', ini:[21,5], fin:[21,38], t:{ es:'El futuro del templo y la vigilancia', en:'The temple’s future and watchfulness' } },
    { id:'luke-022-001-006', ini:[22,1], fin:[22,6], t:{ es:'Complot contra Jesús', en:'The plot against Jesus' } },
    { id:'luke-022-007-038', ini:[22,7], fin:[22,38], t:{ es:'La cena pascual y las enseñanzas finales', en:'The Passover meal and final teachings' } },
    { id:'luke-022-039-046', ini:[22,39], fin:[22,46], t:{ es:'Oración en el monte de los Olivos', en:'Prayer on the Mount of Olives' } },
    { id:'luke-022-047-053', ini:[22,47], fin:[22,53], t:{ es:'Arresto de Jesús', en:'Jesus’ arrest' } },
    { id:'luke-022-054-065', ini:[22,54], fin:[22,65], t:{ es:'Pedro niega conocer a Jesús', en:'Peter denies knowing Jesus' } },
    { id:'luke-022-066-071', ini:[22,66], fin:[22,71], t:{ es:'Jesús ante el consejo', en:'Jesus before the council' } },
    { id:'luke-023-001-025', ini:[23,1], fin:[23,25], t:{ es:'Jesús ante Pilato y Herodes', en:'Jesus before Pilate and Herod' } },
    { id:'luke-023-026-043', ini:[23,26], fin:[23,43], t:{ es:'Crucifixión de Jesús', en:'Jesus’ crucifixion' } },
    { id:'luke-023-044-056', ini:[23,44], fin:[23,56], t:{ es:'Muerte y sepultura de Jesús', en:'Jesus’ death and burial' } },
    { id:'luke-024-001-012', ini:[24,1], fin:[24,12], t:{ es:'La resurrección', en:'The resurrection' } },
    { id:'luke-024-013-035', ini:[24,13], fin:[24,35], t:{ es:'Jesús en el camino a Emaús', en:'Jesus on the road to Emmaus' } },
    { id:'luke-024-036-049', ini:[24,36], fin:[24,49], t:{ es:'Jesús se aparece a los discípulos', en:'Jesus appears to the disciples' } },
    { id:'luke-024-050-053', ini:[24,50], fin:[24,53], t:{ es:'Ascensión de Jesús', en:'Jesus’ ascension' } }
  ];

  const PERICOPAS = { LUK: LUCAS };

  raiz.GlossaPericopas = PERICOPAS;
  if (typeof module !== 'undefined' && module.exports) module.exports = PERICOPAS;
}(typeof globalThis !== 'undefined' ? globalThis : this));
