// Английские переводы загадываемых слов — чтобы цензура закрывала и «popcorn» в названии.
// Формат строки: «слово: вариант вариант». Только однословные варианты; множественное
// число (cats, boxes, puppies) цензура подбирает сама, неправильное — перечислено явно.
const RAW = `
абрикос: apricot
авокадо: avocado
автобус: bus autobus
автомойка: carwash
агентство: agency
адвокат: lawyer attorney advocate
админ: admin administrator
актриса: actress
акула: shark
амбар: barn granary
ананас: pineapple ananas
антенна: antenna antennas
апельсин: orange
аптека: pharmacy drugstore
арахис: peanut
арбуз: watermelon
астероид: asteroid
асфальт: asphalt
ателье: atelier
аэропорт: airport
баба-яга: babayaga baba-yaga
бабка: granny grandma
бабочка: butterfly
бабуля: granny grandma
бабушка: grandmother grandma granny
байдарка: kayak
баклажан: eggplant aubergine
балалайка: balalaika
балерина: ballerina
балкон: balcony
банан: banana
бандит: bandit gangster
баня: bathhouse banya sauna
баран: ram sheep
баранка: bagel
барсук: badger
барыня: lady
батарейка: battery
батарея: radiator battery
батон: loaf baguette
батончик: bar
батя: dad daddy
бачок: tank
баян: accordion bayan
бегемот: hippo hippopotamus
безе: meringue
белка: squirrel
беляш: belyash
берёзка: birch
беседка: gazebo
библиотека: library
библиотекарша: librarian
блендер: blender
блин: pancake crepe
блогер: blogger
блогерша: blogger
блоха: flea
блюдо: dish
блюдце: saucer
бобр: beaver
богомол: mantis
бойлер: boiler
болото: swamp marsh bog
болотце: swamp marsh bog
больница: hospital
бордюр: curb kerb
борода: beard
борщ: borscht borsch borshch
ботинок: boot shoe
боцман: boatswain bosun
бра: sconce
бражка: mash
бревно: log
бремя: burden
брусника: lingonberry cowberry
брюква: rutabaga swede
брюхо: belly
бублик: bagel
будильник: alarm
будка: booth kennel
буженина: pork
булка: bun roll
бульдозер: bulldozer
бургер: burger hamburger
бургерная: burger
бутерброд: sandwich
буфет: buffet sideboard
буфетчица: barmaid
бухгалтер: accountant bookkeeper
бухгалтерия: accounting
бюро: bureau
валенок: valenki
вампир: vampire
ванна: bathtub bath
ванная: bathroom
вареник: dumpling vareniki
варенье: jam
ватрушка: cheesecake
вафля: waffle wafer
вахтёр: watchman
вахтёрша: watchwoman
ведомство: department
ведро: bucket pail
ведьма: witch
ведёрко: bucket pail
велосипед: bicycle bike
вентилятор: fan
веранда: veranda porch
верблюд: camel
вертолёт: helicopter
весло: oar paddle
ветчина: ham
вешалка: hanger
видеокарта: gpu
викинг: viking
вилка: fork
винегрет: vinaigrette
вино: wine
вишня: cherry
внучка: granddaughter
вобла: roach
водка: vodka
водолаз: diver
водохранилище: reservoir
водяной: vodyanoy
войско: army troops
вокзал: station
волга: volga
волк: wolf wolves
волшебник: wizard magician sorcerer
воробей: sparrow
ворона: crow
время: time
вулкан: volcano
выдра: otter
вымя: udder
гадалка: fortuneteller
газель: gazelle
газировка: soda
галка: jackdaw
галстук: tie necktie
гамак: hammock
гараж: garage
гардероб: wardrobe
гармошка: accordion harmonica
гвоздь: nail
геймер: gamer
гимнастка: gymnast
гитара: guitar
гнездо: nest
гном: gnome dwarf
гоблин: goblin
голубец: cabbage
голубь: pigeon dove
гопник: gopnik
горбуша: salmon
горилла: gorilla
горлышко: neck
горох: peas pea
граммофон: gramophone
грейпфрут: grapefruit
гречка: buckwheat
гриб: mushroom
грибник: mushroomer
гром: thunder
грудинка: brisket
грузовик: truck lorry
груша: pear
губернатор: governor
гуманоид: humanoid
гусеница: caterpillar
гусыня: goose geese
гусь: goose geese
дача: dacha
дачник: dacha
дверь: door
двойка: deuce
дворник: janitor
девятка: nine
дед: grandpa grandfather
дедушка: grandpa grandfather
дельфин: dolphin
депо: depot
депутат: deputy
деревня: village
дерево: tree wood
джойстик: joystick gamepad
диван: sofa couch
дизайнер: designer
динамик: speaker
динозавр: dinosaur dino
директриса: headmistress director
дирижабль: airship zeppelin blimp
дождь: rain
долото: chisel
домино: domino dominoes
домовой: domovoi brownie
доставщик: courier deliveryman
дочка: daughter
доярка: milkmaid
дракон: dragon
дрель: drill
дупло: hollow
дуршлаг: colander
дыня: melon
дядя: uncle
дятел: woodpecker
ежевика: blackberry
енот: raccoon
жаба: toad
жвачка: gum bubblegum
желе: jelly
жена: wife
животное: animal
жилище: dwelling
жираф: giraffe
жук: beetle bug
забор: fence
завхоз: caretaker
замок: castle lock
запеканка: casserole
заправка: gas
зарядка: charger
заяц: hare rabbit bunny
землянка: dugout
зеркало: mirror
зефир: marshmallow zephyr
змея: snake
знамя: banner
зонтик: umbrella
зубило: chisel
зёрнышко: grain seed
избушка: hut
изюм: raisin
икра: caviar
имя: name
индюк: turkey
индюшка: turkey
инопланетянин: alien
инопланетянка: alien
интервью: interview
ириска: toffee
кабан: boar
кабачок: zucchini courgette
кадило: censer
казарма: barracks
казино: casino
какаду: cockatoo
какао: cocoa cacao
кактус: cactus cacti
калач: kalach
калькулятор: calculator
кальмар: squid calamari
капитан: captain
капуста: cabbage
карась: carp
карета: carriage
картофель: potato potatoes
картошка: potato potatoes
кастрюля: pot saucepan
катер: boat
каток: rink
кафе: cafe
качалка: gym
каша: porridge
кашне: scarf
кашпо: planter
квас: kvass
кекс: cupcake muffin
кенгуру: kangaroo
кепка: cap
кефир: kefir
киборг: cyborg
кикимора: kikimora
килька: sprat
кимоно: kimono
кино: cinema movie film
кирка: pickaxe
кирпич: brick
кит: whale
клавиатура: keyboard
кладбище: cemetery graveyard
кладовка: pantry closet
клоп: bedbug
клоун: clown
клубника: strawberry
клюква: cranberry
ключ: key
княжество: principality
кобыла: mare
ковбой: cowboy
коврик: rug mat
ковёр: carpet rug
коза: goat
козёл: goat
кокос: coconut
колбаса: sausage
колдунья: witch sorceress
коленка: knee
колено: knee
колесо: wheel
колодец: well
колонка: speaker
колхоз: kolkhoz
кольцо: ring
колёсико: wheel
комар: mosquito
комбайн: combine harvester
комод: dresser
компот: compote
компьютер: computer pc
кондиционер: conditioner
кондукторша: conductor
конура: kennel doghouse
конфета: candy sweet
копейка: kopeck kopek
копьё: spear
корневище: rhizome
корова: cow
коровник: cowshed
королева: queen
королевство: kingdom
коромысло: yoke
корыто: trough
корюшка: smelt
космонавт: cosmonaut astronaut
кот: cat kitty
котлета: cutlet patty
кофе: coffee
кочегар: stoker
кошелёк: wallet purse
кошка: cat kitty
краб: crab
кран: crane faucet tap
крапива: nettle
креветка: shrimp prawn
крендель: pretzel
кресло: armchair
крестьянка: peasant
крокодил: crocodile croc
кружка: mug
крыжовник: gooseberry
крылышко: wing
крыльцо: porch
крыса: rat
крыша: roof
кузнечик: grasshopper
кукуруза: corn maize
кукурузник: corncob
кукушка: cuckoo
куница: marten
курица: chicken hen
куртка: jacket
курьер: courier
курятник: henhouse coop
кухня: kitchen
лаваш: lavash pita
лампа: lamp
лампочка: bulb lightbulb
лапша: noodles noodle
ларёк: kiosk stall
ласточка: swallow
леденец: lollipop
ленивец: sloth
лесник: forester
леший: leshy
лещ: bream
лимон: lemon
лимонад: lemonade
лиса: fox
лифт: elevator lift
лицо: face
логово: lair den
лодка: boat
ложка: spoon
лопата: shovel spade
лопух: burdock
лось: moose elk
лото: lotto bingo
лошадь: horse
лук: onion
лукошко: basket
лысина: bald
львица: lioness
люстра: chandelier
лягушка: frog
лётчик: pilot
магазин: shop store
магнитола: stereo
магнитофон: tape recorder
майонез: mayonnaise mayo
малина: raspberry
мама: mom mum mother mommy
мамонт: mammoth
манго: mango
мандарин: tangerine mandarin
мармелад: marmalade
мартышка: monkey
маршрутка: minibus marshrutka
масло: butter oil
матрас: mattress
машина: car
маяк: lighthouse
медведь: bear
медсестра: nurse
медуза: jellyfish medusa
менеджер: manager
мент: cop
меню: menu
метеорит: meteorite
метла: broom
метро: metro subway
мешок: bag sack
микроскоп: microscope
микрофон: microphone mic
миксер: mixer
мим: mime
минералка: mineral
министерство: ministry
министр: minister
многоэтажка: highrise
молоко: milk
молоток: hammer
моль: moth
мопед: moped
море: sea
морж: walrus
морковка: carrot
морковь: carrot
мороженое: icecream
морс: mors
моряк: sailor
мост: bridge
мотоцикл: motorcycle motorbike
мумия: mummy
муравей: ant
муха: fly
мухомор: amanita toadstool
мыло: soap
мышеловка: mousetrap
мышка: mouse mice
мышь: mouse mice
мясник: butcher
мясо: meat
наливка: liqueur
налим: burbot
налоговая: tax
насекомое: insect bug
настойка: tincture
наушник: headphones earphones
начальница: boss
начальство: bosses
невеста: bride
нива: niva
ниндзя: ninja
норка: mink
носок: sock
нотариус: notary
ноутбук: laptop notebook
обезьяна: monkey ape
облако: cloud
облачко: cloud
обогреватель: heater
оборотень: werewolf werewolves
общежитие: dormitory dorm hostel
общество: society
овца: sheep
огород: garden
огурец: cucumber pickle
одеяло: blanket
озеро: lake
озерцо: pond lake
окно: window
окошко: window
окрошка: okroshka
окунь: perch
оладушек: pancake fritter
олень: deer reindeer
олигарх: oligarch
омлет: omelette omelet
орех: nut walnut
орк: orc
оса: wasp
остановка: stop
осьминог: octopus
отвёртка: screwdriver
отделение: department
официант: waiter
охотник: hunter
охранник: guard security
павлин: peacock
пакет: package bag
палатка: tent
пальма: palm
пальто: coat
памятник: monument
панама: panama
панда: panda
панелька: panelka
пантера: panther
папа: dad daddy father
парикмахерская: barbershop hairdresser
паровоз: locomotive
пасечник: beekeeper
пастбище: pasture
пастила: pastila
патефон: gramophone
паук: spider
певица: singer
пекарня: bakery
пекарь: baker
пельменная: pelmeni
пельмень: dumpling pelmeni
пенсионер: pensioner retiree
пенсионерка: pensioner retiree
первоклассник: firstgrader
перец: pepper
персик: peach
петрушка: parsley
петух: rooster cock
печенье: cookie biscuit
пианино: piano
пиво: beer
пиджак: jacket blazer
пила: saw
пингвин: penguin
пират: pirate
пирожное: cake pastry
пирожок: pie patty
пицца: pizza
пламя: flame
планшет: tablet ipad
плед: blanket plaid
племя: tribe
плечо: shoulder
плов: pilaf plov
пломбир: icecream
плюшка: bun
повар: cook chef
повариха: cook chef
повозка: cart wagon
погреб: cellar
подберёзовик: boletus
подвал: basement cellar
подушка: pillow
подъезд: entrance
пожарный: firefighter fireman
поле: field
полено: log
поликлиника: clinic
полка: shelf
половник: ladle
полотенце: towel
помидор: tomato tomatoes
пони: pony
пончик: donut doughnut
пончо: poncho
попкорн: popcorn
попугай: parrot
портфель: briefcase
похлёбка: stew
пралине: praline
прапорщик: ensign
предприятие: enterprise
привидение: ghost
призрак: ghost phantom
принтер: printer
принцесса: princess
приставка: console
пристанище: shelter
прихожая: hallway
причал: pier dock
программист: programmer developer coder
продавщица: saleswoman
прокурор: prosecutor
простыня: sheet
пряник: gingerbread
пугало: scarecrow
пузико: belly tummy
пузо: belly tummy
пульт: remote
пчела: bee
пылесос: vacuum
пышка: donut
пюре: puree
пятка: heel
пятёрка: five
пёрышко: feather
пёс: dog doggo
рагу: ragout stew
радиатор: radiator
радио: radio
ракета: rocket
раковина: sink shell
раскладушка: cot
редис: radish
редиска: radish
редька: radish
реле: relay
репа: turnip
решето: sieve
робот: robot
роза: rose
розетка: socket outlet
ролл: roll sushi
ромашка: chamomile daisy
роутер: router
ружьё: gun rifle shotgun
руководство: management
рулет: roll
русалка: mermaid
рыба: fish
рыбак: fisherman
рынок: market
рысь: lynx
рыцарь: knight
рэпер: rapper
рюкзак: backpack rucksack
рюмочная: bar
салат: salad
сало: lard salo
самовар: samovar
самокат: scooter
самурай: samurai
сантехник: plumber
сарай: shed barn
саранча: locust
сарделька: sausage
сауна: sauna
свекровь: mother-in-law
сверчок: cricket
светофор: traffic
свинарка: swineherd
свинарник: pigsty
свинья: pig swine
свитер: sweater
свёкла: beet beetroot
седло: saddle
секретарша: secretary
село: village
селёдка: herring
семя: seed
сервант: sideboard
сердечко: heart
сердце: heart
синица: tit titmouse
сито: sieve
сифон: siphon
скелет: skeleton
сковородка: pan frypan skillet
скорпион: scorpion
скутер: scooter
слива: plum
слово: word
слон: elephant
смартфон: smartphone phone
смеситель: mixer faucet
сметана: sourcream
смородина: currant
собака: dog doggo
сова: owl
солнце: sun
солнышко: sun sunshine
солянка: solyanka
сом: catfish
сомбреро: sombrero
сообщество: community
сорока: magpie
сосед: neighbor neighbour
соседка: neighbor neighbour
сосиска: sausage hotdog
сосна: pine
спальня: bedroom
спутник: satellite sputnik
стадо: herd
стол: table desk
столовая: canteen cafeteria
страус: ostrich
страшилище: monster
стрекоза: dragonfly
стремя: stirrup
стример: streamer
стримерша: streamer
студент: student
студентка: student
стул: chair
стюардесса: stewardess
субмарина: submarine
сугроб: snowdrift
сундук: chest trunk
суп: soup
суслик: gopher
суфле: souffle
сухарик: crouton
сухарь: rusk cracker
сушка: sushka
существо: creature
сырник: syrniki
сырок: cheese
сёмга: salmon
табурет: stool
табуретка: stool
тазик: basin
такси: taxi cab
таксист: taxi cabbie
танк: tank
тапок: slipper
тапочка: slipper
таракан: cockroach roach
тарань: roach
тарелка: plate
тачка: wheelbarrow
телевизор: tv television
телега: cart
телескоп: telescope
темя: crown
теплица: greenhouse
тепловоз: locomotive
теплоход: ship
терминатор: terminator
тестировщик: tester qa
тесто: dough
тефтеля: meatball
тигрица: tigress
ткачиха: weaver
тоннель: tunnel
топор: axe ax
торт: cake
торшер: lamp
тостер: toaster
точило: sharpener
трактор: tractor
тракторист: tractor
трамвай: tram streetcar
троллейбус: trolleybus
тролль: troll
трюмо: dresser
туман: fog mist
тумбочка: nightstand
тунец: tuna
турист: tourist
тыква: pumpkin
тюлень: seal
тюлька: sprat
тюрьма: prison jail
тяпка: hoe
тётя: aunt auntie
тёща: mother-in-law
убежище: shelter bunker
уборщица: cleaner janitor
укроп: dill
улитка: snail
унитаз: toilet
управление: management
утка: duck
утюг: iron
уха: ukha
ухо: ear
участковый: policeman
училище: college
учительница: teacher
учреждение: institution
ушанка: ushanka
ушко: ear
фасоль: beans bean
фермер: farmer
фея: fairy
физрук: coach
филин: owl
финик: date
флешка: flash usb
фойе: foyer lobby
фокусник: magician
фонарь: lantern flashlight
фондю: fondue
фонтан: fountain
форточка: window
фундук: hazelnut
футболка: tshirt t-shirt
халва: halva halwa
хижина: hut cabin
холодец: aspic
холодильник: fridge refrigerator
хомяк: hamster
хорёк: ferret
хранилище: storage vault
хрен: horseradish
хрущёвка: khrushchevka
хрюшка: piggy pig
хурма: persimmon
цапля: heron
царица: tsarina queen
царство: kingdom
чай: tea
чайка: seagull gull
чайник: kettle teapot
чебурек: cheburek chebureki
чемодан: suitcase
червяк: worm
чердак: attic
черепаха: turtle tortoise
черешня: cherry
черника: blueberry bilberry
чеснок: garlic
чечевица: lentil
чудище: monster
чудо: miracle wonder
чудовище: monster beast
чучело: scarecrow
шаман: shaman
шампанское: champagne
шапка: hat
шарлотка: charlotte
шаурма: shawarma shaurma
шашлык: shashlik kebab barbecue bbq
шашлычная: shashlik kebab
швабра: mop
шериф: sheriff
шило: awl
шимпанзе: chimpanzee chimp
шиномонтажка: tire
шкаф: wardrobe closet cabinet
школа: school
школьник: schoolboy pupil
школьница: schoolgirl pupil
шлагбаум: barrier
шмель: bumblebee
шоколадка: chocolate
шоссе: highway
щербет: sherbet sorbet
щука: pike
экскаватор: excavator digger
экстрасенс: psychic
электричка: train
электровоз: locomotive
эльф: elf elves
эскимо: eskimo popsicle
этажерка: whatnot
юнга: cabin
юрта: yurt
яблоко: apple
яичко: egg
яичница: eggs
яйцо: egg
яхта: yacht
ящерица: lizard
ящик: box crate
ёж: hedgehog
ёлка: fir spruce
ёрш: ruff
хуй: dick cock
пизда: pussy cunt
жопа: ass butt arse
говно: shit poop crap
хер: dick
мудак: asshole jerk
мудила: asshole jerk
долбоёб: moron dumbass
пиздец: fuck clusterfuck
хуйня: bullshit crap
залупа: dickhead
сука: bitch
блядь: whore slut
ебло: face mug
ебальник: face mug
уёбок: bastard asshole
ебанат: moron dumbass
пиздюк: brat
хуесос: cocksucker
гандон: condom
мразь: scum
падла: bastard
сволочь: bastard scum
говнюк: shithead
срака: ass butt
херня: bullshit crap
пиздабол: bullshitter liar
пиздёж: bullshit
хуило: dickhead
мандавошка: crab louse
дерьмо: shit crap
засранец: brat
жополиз: asskisser bootlicker
очко: asshole
писька: willy pussy
крипер: creeper
эндермен: enderman endermen
зомби: zombie
алмаз: diamond
изумруд: emerald
редстоун: redstone
незерит: netherite
обсидиан: obsidian
портал: portal
незер: nether
верстак: workbench crafting
печка: furnace stove
меч: sword
броня: armor armour
кровать: bed
факел: torch
житель: villager
железо: iron
золото: gold
уголь: coal
лава: lava
шахта: mine
ферма: farm
моб: mob
спавн: spawn
биом: biome
сервер: server
мод: mod
скин: skin
крафт: craft crafting
грифер: griefer
хардкор: hardcore
выживание: survival
данж: dungeon
крепость: fortress stronghold
зачарование: enchantment enchanting
зелье: potion
жемчуг: pearl
слизень: slime
ифрит: blaze
гаст: ghast
вагонетка: minecart
рельс: rail
поршень: piston
лут: loot
нуб: noob newbie
читер: cheater hacker
донат: donate donation
лаунчер: launcher
шейдер: shader
хиробрин: herobrine
бедрок: bedrock
блок: block
булыжник: cobblestone
гравий: gravel
песок: sand
иссушитель: wither
голем: golem
майнкрафт: minecraft
летсплей: letsplay
стрим: stream
челлендж: challenge
`;

const TRANSLATIONS = new Map(
  RAW.trim()
    .split("\n")
    .map((line) => {
      const [word, rest] = line.split(":");
      return [word.trim(), rest.trim().split(/\s+/)] as const;
    }),
);

export function englishFor(word: string): string[] {
  return TRANSLATIONS.get(word) ?? [];
}
