import type { CategorySlug } from "@ntc/shared";
import { q, W, type Seed } from "../helpers";

/**
 * Autumn 2026 batch: 15 new questions per category, released five per category each Monday
 * (see index.ts). Correct answer first, as everywhere in the bank.
 */
export const AUTUMN_2026: Record<CategorySlug, Seed[]> = {
  nollywood: [
    q(1, "Actress Adesua Etomi is married to which singer?", ["Banky W", "Wizkid", "Timi Dakolo", "Praiz"], "They married in 2017.", W + "Adesua_Etomi"),
    q(1, "Child star Emmanuella shot to fame on which YouTube comedy channel?", ["Mark Angel Comedy", "Ikorodu Bois", "Brain Jotter TV", "Taaooma TV"], "Her catchphrase-filled skits made her one of Africa's best-known child comedians.", W + "Mark_Angel_Comedy"),
    q(3, "Gangs of Lagos (2023) was the first Nigerian original film made for which streaming service?", ["Amazon Prime Video", "Netflix", "Showmax", "Disney+"], "It was directed by Jade Osiberu.", W + "Gangs_of_Lagos"),
    q(4, "Who directed House of Ga'a (2024), about an Oyo Empire kingmaker?", ["Bolanle Austen-Peters", "Kunle Afolayan", "Kemi Adetiba", "Tunde Kelani"], "It tells the story of Bashorun Gaa.", W + "House_of_Ga%27a"),
    q(5, "In 2016, which festival spotlighted Lagos in its 'City to City' programme?", ["Toronto International Film Festival", "Cannes Film Festival", "Berlin International Film Festival", "Sundance Film Festival"], "Eight Nollywood films were selected for the showcase.", W + "Cinema_of_Nigeria"),

    q(2, "Who played Dunni in The Wedding Party?", ["Adesua Etomi", "Funke Akindele", "Toyin Abraham", "Nancy Isime"], "The film was the highest-grossing Nollywood title on release.", W + "The_Wedding_Party_(2016_film)"),
    q(2, "Which actress played the comic character Toyin Tomato?", ["Toyin Abraham", "Funke Akindele", "Bimbo Ademoye", "Mercy Johnson"], "Toyin Tomato first appeared alongside Jenifa.", W + "Toyin_Abraham"),
    q(2, "Jason Njoku co-founded which Nollywood streaming service?", ["iROKOtv", "Showmax", "Netflix Naija", "Nollyflix"], "iROKOtv was nicknamed the 'Netflix of Africa'.", W + "Jason_Njoku"),
    q(3, "Skit-maker Taaooma's real name is?", ["Maryam Apaokagi", "Bukunmi Adeaga", "Tolani Baj", "Mercy Chinwo"], "Her skits often star her as both mother and daughter.", W + "Taaooma"),
    q(4, "In Jenifa, Eniola Badmus played which character?", ["Gbogbo Bigz", "Toyosi", "Kiki", "Mama Jenifa"], "The role became one of her most famous.", W + "Eniola_Badmus"),

    q(3, "Banky W played which character in The Wedding Party?", ["Dozie", "Nonso", "Felix", "Sola"], "Dozie marries Dunni, played by his real-life wife.", W + "The_Wedding_Party_(2016_film)"),
    q(3, "Bolanle Austen-Peters founded which Lagos arts and culture centre?", ["Terra Kulture", "Freedom Park", "The Shrine", "Muson Centre"], "She is also known for staging big musicals like Fela and the Kalakuta Queens.", W + "Bolanle_Austen-Peters"),
    q(4, "Comedian Lasisi Elenu's real name is?", ["Nosa Afolabi", "Debo Adedayo", "Emmanuel Ejekwu", "Josh Alfred"], "He became famous for his exaggerated facial expressions.", W + "Lasisi_Elenu"),
    q(4, "Who directed the Netflix film Amina (2021), about the warrior queen of Zazzau?", ["Izu Ojukwu", "Kunle Afolayan", "Niyi Akinmolayan", "Kenneth Gyang"], "Izu Ojukwu also directed '76.", W + "Izu_Ojukwu"),
    q(5, "Ojuju (2014), a zombie film set in a Lagos slum, was directed by?", ["C.J. Obasi", "Kemi Adetiba", "Tope Oshin", "Jade Osiberu"], "C.J. Obasi later directed Mami Wata.", W + "Ojuju"),
  ],

  afrobeats: [
    q(1, "Which singer released the 2022 dance-challenge hit 'Buga'?", ["Kizz Daniel", "Tekno", "Ruger", "Fireboy DML"], "'Buga' features Tekno.", W + "Kizz_Daniel"),
    q(2, "What is Asake's real name?", ["Ahmed Ololade", "Divine Ikubor", "Adedamola Adefolahan", "Habeeb Okikiola"], "He rose to fame on Olamide's YBNL label.", W + "Asake"),
    q(3, "Tems won a Grammy for her feature on which Future song?", ["Wait for U", "Mask Off", "Life Is Good", "Way 2 Sexy"], "It won Best Melodic Rap Performance in 2023.", W + "Tems"),
    q(3, "Oxlade's 2022 song that went viral after his COLORS performance was?", ["Ku Lo Sa", "Calm Down", "Sungba", "Peru"], "The COLORS video passed tens of millions of views.", W + "Oxlade"),
    q(4, "In 2023, Burna Boy became the first African artist to headline a UK stadium. Which one?", ["London Stadium", "Wembley Stadium", "Old Trafford", "Emirates Stadium"], "He played to around 60,000 fans.", W + "Burna_Boy"),

    q(2, "What is Rema's real name?", ["Divine Ikubor", "Ayodeji Balogun", "David Adeleke", "Daniel Benson"], "Rema is from Benin City.", W + "Rema_(singer)"),
    q(3, "Asake's debut album, released in 2022, is called?", ["Mr. Money with the Vibe", "Work of Art", "Lungu Boy", "Timeless"], "It debuted on the Billboard 200.", W + "Mr._Money_with_the_Vibe"),
    q(3, "Davido's father, a billionaire businessman, is?", ["Adedeji Adeleke", "Mike Adenuga", "Femi Otedola", "Aliko Dangote"], "His uncle Ademola Adeleke became Governor of Osun State in 2022.", W + "Davido"),
    q(4, "Rapper Dagrin, who died in 2010, was celebrated for rapping mostly in which language?", ["Yoruba", "Igbo", "Pidgin", "Hausa"], "His album C.E.O. was released just before his death.", W + "Dagrin"),
    q(4, "Mr Eazi founded which music label and artist fund?", ["emPawa Africa", "Mavin Records", "Chocolate City", "Starboy Entertainment"], "emPawa backs young African artists with grants.", W + "Mr_Eazi"),

    q(2, "Lagbaja is famous for performing with?", ["A masked face", "Dark sunglasses", "A bowler hat", "White face paint"], "His music blends Afrobeat, jazz and Yoruba rhythms.", W + "Lagbaja"),
    q(3, "What is Tems's real name?", ["Temilade Openiyi", "Temitope Adeyemi", "Temidayo Ogunleye", "Temiloluwa Bello"], "Tems was born in Lagos in 1995.", W + "Tems"),
    q(3, "Singer Teni's elder sister is which singer?", ["Niniola", "Simi", "Waje", "Seyi Shay"], "Niniola's 'Maradona' was a 2017 hit.", W + "Teni_(singer)"),
    q(3, "Which rapper released the 2022 hit 'Ozumba Mbadiwe'?", ["Reekado Banks", "Olamide", "Zlatan", "Phyno"], "The song is named after a Lagos road.", W + "Reekado_Banks"),
    q(3, "What is Ayra Starr's real name?", ["Oyinkansola Sarah Aderibigbe", "Temilade Openiyi", "Simisola Kosoko", "Niniola Apata"], "Ayra Starr is signed to Mavin Records.", W + "Ayra_Starr"),
  ],

  football: [
    q(2, "What is Nigeria's top men's football league called?", ["Nigeria Professional Football League", "Nigeria Premier Soccer League", "Naija Super League", "Federal Football Division"], "It is often shortened to NPFL.", W + "Nigeria_Professional_Football_League"),
    q(3, "Asisat Oshoala won the UEFA Women's Champions League with which club?", ["Barcelona", "Lyon", "Chelsea", "Arsenal"], "She was the first African to score in a Women's Champions League final.", W + "Asisat_Oshoala"),
    q(3, "Super Eagles defender Taribo West was famous for his colourful…", ["Braided hairstyles", "Football boots", "Goalkeeper gloves", "Headbands"], "He played for both Inter Milan and AC Milan.", W + "Taribo_West"),
    q(4, "Which Nigerian club is nicknamed 'Sai Masu Gida'?", ["Kano Pillars", "Shooting Stars", "Enyimba", "Rangers International"], "The club plays in Kano.", W + "Kano_Pillars_F.C."),
    q(4, "Who became Nigeria's first Winter Olympic skeleton athlete, in 2018?", ["Simidele Adeagbo", "Seun Adigun", "Ngozi Onwumere", "Akuoma Omeoga"], "She was also the first African woman to compete in skeleton.", W + "Simidele_Adeagbo"),

    q(2, "In which year did Nigeria win its first Africa Cup of Nations?", ["1980", "1994", "2013", "1976"], "Nigeria beat Algeria 3–0 in the final in Lagos.", W + "1980_African_Cup_of_Nations"),
    q(3, "Nigeria's women's U-17 football team is nicknamed?", ["Flamingos", "Falconets", "Golden Eaglets", "Super Falcons"], "They have reached several U-17 Women's World Cup semi-finals.", W + "Nigeria_women%27s_national_under-17_football_team"),
    q(4, "Lobi Stars are based in which city?", ["Makurdi", "Jos", "Lafia", "Lokoja"], "Makurdi is the capital of Benue State.", W + "Lobi_Stars_F.C."),
    q(4, "Which British-Nigerian forward won the 2019 NBA title with the Toronto Raptors?", ["OG Anunoby", "Josh Okogie", "Precious Achiuwa", "Chimezie Metu"], "His full name is Ogugua Anunoby.", W + "OG_Anunoby"),
    q(4, "Which Super Eagles striker was joint top scorer at the 2013 Africa Cup of Nations?", ["Emmanuel Emenike", "Ikechukwu Uche", "Brown Ideye", "Victor Moses"], "Nigeria won that tournament in South Africa.", W + "Emmanuel_Emenike"),

    q(3, "Nigeria's women's U-20 football team is nicknamed?", ["Falconets", "Flamingos", "Super Falcons", "Flying Eagles"], "The Falconets reached the U-20 Women's World Cup final in 2010 and 2014.", W + "Nigeria_women%27s_national_under-20_football_team"),
    q(3, "How many Women's Africa Cup of Nations titles have the Super Falcons won?", ["10", "6", "8", "12"], "Their tenth came at the 2024 tournament, played in 2025.", W + "Nigeria_women%27s_national_football_team"),
    q(4, "Akwa United are based in which city?", ["Uyo", "Calabar", "Port Harcourt", "Eket"], "The club won the NPFL title in 2021.", W + "Akwa_United_F.C."),
    q(4, "The Super Falcons won the 2024 Women's Africa Cup of Nations by beating which host nation in the final?", ["Morocco", "South Africa", "Ghana", "Zambia"], "Nigeria came from 2–0 down to win 3–2.", W + "2024_Women%27s_Africa_Cup_of_Nations"),
    q(5, "Which Nigerian club won the 1990 African Cup Winners' Cup?", ["BCC Lions", "Enyimba", "Shooting Stars", "Rangers International"], "The club is based in Gboko, Benue State.", W + "BCC_Lions_F.C."),
  ],

  history: [
    q(2, "Which Nigerian president died in office in 2010?", ["Umaru Musa Yar'Adua", "Sani Abacha", "Murtala Mohammed", "Shehu Shagari"], "Vice-President Goodluck Jonathan succeeded him.", W + "Umaru_Musa_Yar%27Adua"),
    q(3, "Who was Nigeria's first Vice-President?", ["Alex Ekwueme", "Goodluck Jonathan", "Atiku Abubakar", "Yemi Osinbajo"], "He served under Shehu Shagari from 1979.", W + "Alex_Ekwueme"),
    q(3, "Which Nigerian was Secretary-General of the Commonwealth from 1990 to 2000?", ["Emeka Anyaoku", "Ibrahim Gambari", "Joseph Garba", "Adebayo Adedeji"], "He was the first African to hold the post.", W + "Emeka_Anyaoku"),
    q(4, "What was the currency of Biafra?", ["Biafran pound", "Biafran naira", "Biafran shilling", "Biafran cowrie"], "Biafra issued its own notes and coins during the civil war.", W + "Biafran_pound"),
    q(5, "Who was Nigeria's first indigenous Inspector-General of Police?", ["Louis Edet", "Kam Salem", "Muhammadu Dikko Yusufu", "Sunday Adewusi"], "He took office in 1964.", W + "Louis_Edet"),

    q(3, "Who led the Abeokuta Women's Union protests against unfair taxes in the 1940s?", ["Funmilayo Ransome-Kuti", "Margaret Ekpo", "Efunroye Tinubu", "Gambo Sawaba"], "The protests led to the Alake of Egbaland's temporary abdication in 1949.", W + "Funmilayo_Ransome-Kuti"),
    q(4, "Shehu Shagari won the 1979 election on the ticket of which party?", ["National Party of Nigeria", "Unity Party of Nigeria", "Nigerian People's Party", "Great Nigeria People's Party"], "The NPN won again in 1983.", W + "Shehu_Shagari"),
    q(4, "Gambo Sawaba was a fearless women's rights campaigner and politician in which region?", ["Northern Nigeria", "Western Region", "Eastern Region", "Mid-Western Region"], "She was jailed many times for her activism.", W + "Gambo_Sawaba"),
    q(4, "Who was the first female commercial pilot in Nigeria?", ["Chinyere Kalu", "Stella Thomas", "Aloma Mukhtar", "Ngozi Okonjo-Iweala"], "She later headed the Nigerian College of Aviation Technology.", W + "Chinyere_Kalu"),
    q(5, "In 1975, Nigeria renamed the Bight of Biafra to what?", ["Bight of Bonny", "Bight of Benin", "Bight of Calabar", "Bight of Lagos"], "The change came five years after the civil war.", W + "Bight_of_Bonny"),

    q(4, "Which Nigerian was Secretary-General of OPEC from 2016 until his death in 2022?", ["Mohammed Barkindo", "Rilwanu Lukman", "Edmund Daukoru", "Diezani Alison-Madueke"], "He led OPEC through the 2020 oil price crash.", W + "Mohammed_Barkindo"),
    q(5, "Who was Nigeria's first female lawyer?", ["Stella Thomas", "Folake Solanke", "Aloma Mukhtar", "Funmilayo Ransome-Kuti"], "She was called to the bar in London in 1933.", W + "Stella_Thomas"),
    q(5, "Who was President of the Senate in Nigeria's Second Republic (1979–83)?", ["Joseph Wayas", "Nnamdi Azikiwe", "Chuba Okadigbo", "David Mark"], "He was from Cross River State.", W + "Joseph_Wayas"),
    q(5, "Who was the first Nigerian Vice-Chancellor of the University of Ibadan?", ["Kenneth Dike", "Eni Njoku", "Ayodele Awojobi", "Saburi Biobaku"], "Dike was a pioneering historian of West Africa.", W + "Kenneth_Dike"),
    q(5, "Who was Nigeria's first female senator?", ["Wuraola Esan", "Margaret Ekpo", "Janet Mokelu", "Franca Afegbua"], "She was appointed to the Senate in 1960.", W + "Wuraola_Esan"),
  ],

  geography: [
    q(1, "Nigeria is the most populous country in which continent?", ["Africa", "Asia", "South America", "Europe"], "It is also among the ten most populous countries in the world.", W + "Nigeria"),
    q(2, "Lagos State's official slogan is?", ["Centre of Excellence", "Pace Setter State", "Home of Peace and Tourism", "Land of Promise"], "It appears on Lagos vehicle number plates.", W + "Lagos_State"),
    q(3, "Abuja's Millennium Park was opened in 2003 by?", ["Queen Elizabeth II", "Nelson Mandela", "Kofi Annan", "Bill Clinton"], "It opened during the Commonwealth summit held in Abuja.", W + "Millennium_Park_(Abuja)"),
    q(4, "In which year was the Bakassi Peninsula handed over to Cameroon?", ["2008", "1998", "2002", "2014"], "The handover followed a 2002 ruling by the International Court of Justice.", W + "Bakassi"),
    q(5, "Which river flows through Ibadan and caused deadly floods in 1980?", ["Ogunpa", "Ogun", "Osun", "Oba"], "The Ogunpa floods led to major channelisation works.", W + "Ibadan"),

    q(2, "Nigeria's population is estimated at more than how many people (2020s)?", ["200 million", "100 million", "80 million", "500 million"], "The last full census was held in 2006.", W + "Demographics_of_Nigeria"),
    q(3, "Plateau State's official slogan is?", ["Home of Peace and Tourism", "Centre of Commerce", "Glory of All Lands", "Pace Setter State"], "Its capital, Jos, is known for its cool climate.", W + "Plateau_State"),
    q(3, "Which man-made lake was created by the Kainji Dam?", ["Kainji Lake", "Lake Chad", "Oguta Lake", "Lake Jebba"], "Kainji Lake National Park surrounds part of it.", W + "Kainji_Lake"),
    q(4, "Which Akwa Ibom town is known as the 'Raffia City'?", ["Ikot Ekpene", "Eket", "Oron", "Abak"], "It is famous for raffia crafts.", W + "Ikot_Ekpene"),
    q(4, "Which mountain range runs along Nigeria's north-eastern border with Cameroon?", ["Mandara Mountains", "Atlas Mountains", "Jos Plateau", "Shere Hills"], "They stretch through Borno and Adamawa.", W + "Mandara_Mountains"),

    q(3, "Eko Atlantic city is being built on land reclaimed beside which Lagos district?", ["Victoria Island", "Ikorodu", "Badagry", "Epe"], "The land was reclaimed from the Atlantic Ocean.", W + "Eko_Atlantic"),
    q(3, "Akwa Ibom State's official slogan is?", ["Land of Promise", "Glory of All Lands", "Big Heart", "Gateway State"], "Its capital is Uyo.", W + "Akwa_Ibom_State"),
    q(4, "Bayelsa State's official slogan is?", ["Glory of All Lands", "Land of Promise", "Treasure Base of the Nation", "Heartbeat of the Nation"], "Bayelsa is the home state of Goodluck Jonathan.", W + "Bayelsa_State"),
    q(4, "Gashaka-Gumti, Nigeria's largest national park, is in which two states?", ["Taraba and Adamawa", "Bauchi and Gombe", "Borno and Yobe", "Niger and Kwara"], "It borders Cameroon.", W + "Gashaka_Gumti_National_Park"),
    q(4, "Yankari Game Reserve is famous for which warm spring?", ["Wikki Warm Spring", "Ikogosi Warm Spring", "Olumirin Spring", "Rafin Kada"], "The spring stays at about 31 °C all year.", W + "Yankari_National_Park"),
  ],

  food: [
    q(1, "Which snack is a pastry filled with minced meat, potatoes and carrots?", ["Meat pie", "Puff-puff", "Chin chin", "Akara"], "It is a staple of Nigerian bakeries and parties.", W + "Meat_pie"),
    q(2, "In Igbo cooking, 'ofe' means?", ["Soup", "Rice", "Meat", "Pepper"], "Ofe onugbu is bitter leaf soup.", W + "Igbo_cuisine"),
    q(3, "Jollof rice is named after the Wolof (Jolof) Empire, which was in present-day?", ["Senegal", "Ghana", "Nigeria", "Mali"], "Nigeria and Ghana still argue over whose jollof is best.", W + "Jollof_rice"),
    q(3, "Golden Morn cereal is made by which company?", ["Nestlé", "Cadbury", "Dangote", "Honeywell"], "It is made from maize and soya.", W + "Nestl%C3%A9"),
    q(4, "Which lager was Nigerian Breweries' first beer, brewed in 1949?", ["Star", "Gulder", "Trophy", "Hero"], "The first bottle rolled off the line in Lagos.", W + "Nigerian_Breweries"),

    q(2, "Thin, crispy plantain chips are popularly called?", ["Ipekere", "Dodo", "Boli", "Ukwa"], "They are sold in small packs on the roadside.", W + "Nigerian_cuisine"),
    q(2, "Ogbono soup is made from the ground seeds of which fruit?", ["African bush mango", "Coconut", "Breadfruit", "Avocado"], "The seeds give the soup its stretchy, 'draw' texture.", W + "Irvingia_gabonensis"),
    q(3, "Maltina is a non-alcoholic malt drink made by which company?", ["Nigerian Breweries", "Guinness Nigeria", "Coca-Cola", "Dangote"], "Malt drinks are a party favourite.", W + "Nigerian_Breweries"),
    q(3, "Wara (awara), a soft cheese, is traditionally made by which people?", ["Fulani", "Igbo", "Ijaw", "Efik"], "It is often fried and eaten as a snack.", W + "Nigerian_cuisine"),
    q(4, "Dodo Ikire is made from?", ["Overripe plantain", "Unripe plantain", "Yam", "Cocoyam"], "It is named after Ikire, a town in Osun State.", W + "Nigerian_cuisine"),

    q(4, "In 'kunun zaki', what does 'zaki' mean in Hausa?", ["Sweet", "Cold", "Milk", "Red"], "Kunun zaki is usually made from millet.", W + "Kunu"),
    q(4, "The name 'zobo' comes from which Hausa word?", ["Zoborodo", "Zogale", "Zuma", "Zaki"], "Zoborodo is the Hausa name for the roselle plant.", W + "Roselle_(plant)"),
    q(4, "Sinasir is a northern Nigerian?", ["Rice pancake", "Beef stew", "Groundnut drink", "Bean soup"], "It is often eaten with miyan taushe.", W + "Nigerian_cuisine"),
    q(4, "Shuku shuku is a sweet snack made mainly from?", ["Coconut", "Groundnut", "Plantain", "Beans"], "The balls are rolled in flour and baked.", W + "Nigerian_cuisine"),
    q(4, "Otong soup, from the Efik and Ibibio, is made mainly with?", ["Okra", "Egusi", "Ogbono", "Bitter leaf"], "It is often cooked with uziza and ugu leaves.", W + "Efik_people"),
  ],

  pidgin: [
    q(1, "When someone answers 'I dey', they mean?", ["I'm fine / I'm here", "I'm leaving", "I'm hungry", "I'm angry"], "'How far?' 'I dey!'", W + "Nigerian_Pidgin"),
    q(2, "In Pidgin, 'No shaking' means?", ["No problem, everything is fine", "Stand still", "Don't dance", "I'm cold"], "'You get am? No shaking.'", W + "Nigerian_Pidgin"),
    q(2, "In Naija slang, a 'JJC' is?", ["A newcomer who doesn't know how things work", "A rich uncle", "A police officer", "A wedding planner"], "It stands for 'Johnny Just Come'.", W + "Nigerian_Pidgin"),
    q(3, "In Pidgin, 'Body no be firewood' means?", ["I'm human, I get tired", "I'm very strong", "It's cold today", "Light the fire"], "People say it when they need a rest.", W + "Nigerian_Pidgin"),
    q(3, "In Pidgin, to 'yab' someone means?", ["To mock or insult them", "To feed them", "To lend them money", "To run from them"], "'Na so dem yab am for social media.'", W + "Nigerian_Pidgin"),

    q(2, "In Pidgin, 'Don't fall my hand' means?", ["Don't let me down", "Don't drop my phone", "Don't hold my hand", "Don't push me"], "It's a common plea before a big task.", W + "Nigerian_Pidgin"),
    q(2, "Something that is 'tear rubber' is?", ["Brand new", "Torn", "Second-hand", "Fake"], "'Tear rubber' means it's still in its wrapping.", W + "Nigerian_Pidgin"),
    q(3, "In Naija slang, a 'lepa' is?", ["A slim person", "A rich man", "A big eater", "A tall person"], "The opposite, a plump person, is an 'orobo'.", W + "Nigerian_Pidgin"),
    q(3, "When someone says 'Ehen!', they usually mean?", ["Oh, I see / go on", "No way", "Goodbye", "I'm full"], "'Ehen, then wetin happen?'", W + "Nigerian_Pidgin"),
    q(3, "In Pidgin, 'lailai' means?", ["Never (ever)", "Always", "Tomorrow", "Slowly"], "It comes from Yoruba 'láíláí'.", W + "Nigerian_Pidgin"),

    q(2, "In 'the man wey come yesterday', what does 'wey' mean?", ["Who / that", "Where", "Why", "When"], "'Wey' links a description to a person or thing.", W + "Nigerian_Pidgin"),
    q(3, "When someone says 'You dey play', they mean?", ["You're not being serious", "You're playing football", "You're winning", "You're dancing well"], "It's often said to someone underestimating a situation.", W + "Nigerian_Pidgin"),
    q(3, "In Pidgin, 'I no fit shout' means?", ["I won't stress myself over it", "I've lost my voice", "I'm too shy", "I can't sing"], "It signals you've given up arguing.", W + "Nigerian_Pidgin"),
    q(3, "In Pidgin, 'Fashi am' means?", ["Forget it / let it go", "Fight him", "Fix it", "Follow him"], "It comes from Yoruba 'fi sílẹ̀', meaning 'leave it'.", W + "Nigerian_Pidgin"),
    q(4, "In Naija slang, a 'maga' is?", ["A scammer's victim", "A boss", "A thief", "A trickster"], "The phrase 'maga don pay' became a famous song line.", W + "Nigerian_Pidgin"),
  ],

  proverbs: [
    q(2, "'Ẹ káàbọ̀' means what in Yoruba?", ["Welcome", "Goodbye", "Thank you", "Good night"], "You'll hear it when arriving at a Yoruba home.", W + "Yoruba_language"),
    q(2, "'Ó dàbọ̀' means what in Yoruba?", ["Goodbye", "Welcome", "Good morning", "Well done"], "It literally means 'until we meet again'.", W + "Yoruba_language"),
    q(3, "Which is the Yoruba word for 'one'?", ["Ọ̀kan", "Méjì", "Mẹ́ta", "Mẹ́rin"], "Yoruba counting is partly based on twenties.", W + "Yoruba_numerals"),
    q(3, "'Barka da Sallah' is a Hausa greeting for?", ["Eid (Sallah) celebrations", "A wedding", "A birthday", "Good morning"], "Sallah is the Hausa name for the Eid festivals.", W + "Hausa_language"),
    q(5, "Achebe wrote: 'When the moon is shining the cripple becomes hungry for…'", ["A walk", "Food", "Sleep", "A song"], "The line opens a moonlit night scene in Things Fall Apart.", W + "Things_Fall_Apart"),

    q(3, "'Nnọọ' means what in Igbo?", ["Welcome", "Goodbye", "Thank you", "Sorry"], "It is often said twice: 'Nnọọ, nnọọ!'", W + "Igbo_language"),
    q(3, "Which is the Igbo word for 'one'?", ["Otu", "Abụọ", "Atọ", "Anọ"], "'Abụọ' means two.", W + "Igbo_language"),
    q(3, "'Ka ọ dị' is a common Igbo way to say?", ["Goodbye / see you later", "Good morning", "Thank you", "How much?"], "Igbo greetings often ask after family.", W + "Igbo_language"),
    q(4, "The Yoruba name 'Ayọ̀dèjì' means?", ["Joy has become two", "Joy has come home", "Born on a Sunday", "Wealth has arrived"], "'Ayọ̀' means joy.", W + "Yoruba_name"),
    q(4, "The Hausa name 'Danjuma' is traditionally given to?", ["A boy born on a Friday", "A first son", "A boy born during rain", "A twin"], "'Juma'a' is Friday in Hausa.", W + "Hausa_people"),

    q(3, "'Sai an jima' means what in Hausa?", ["See you later", "Thank you", "Good morning", "Welcome"], "'Sai gobe' means 'see you tomorrow'.", W + "Hausa_language"),
    q(4, "Which is the Hausa word for 'one'?", ["Ɗaya", "Biyu", "Uku", "Huɗu"], "Hausa uses special hooked letters like ɗ and ƙ.", W + "Hausa_language"),
    q(4, "'Allah ya kiyaye' is a Hausa phrase meaning?", ["May God protect (us)", "Good night", "Let's eat", "Go well"], "It is said when something bad is mentioned.", W + "Hausa_language"),
    q(4, "The Igbo name 'Ndubuisi' means?", ["Life is the most important thing", "God is great", "Wealth is power", "Peace has come"], "Many Igbo names are short sentences.", W + "Igbo_people"),
    q(5, "Achebe wrote: 'A man who calls his kinsmen to a feast does not do so to save them from…'", ["Starving", "The rain", "Their enemies", "Shame"], "An elder says it at Okonkwo's farewell feast in Mbanta, in Things Fall Apart.", W + "Things_Fall_Apart"),
  ],

  "naija-life": [
    q(1, "What does NYSC stand for?", ["National Youth Service Corps", "Nigerian Youth Skills Council", "National Young Students Club", "Nigeria Youth Sports Commission"], "Graduates serve for one year, usually away from their home state.", W + "National_Youth_Service_Corps"),
    q(1, "Ankara is a…", ["Colourful printed wax fabric", "Type of soup", "Hairstyle", "Dance"], "Ankara outfits are everywhere at owambes.", W + "African_wax_prints"),
    q(2, "The Durbar festival in northern Nigeria is famous for?", ["Parades of decorated horsemen", "Boat racing", "Wrestling", "Masquerades"], "Durbars are held at Sallah in cities like Kano and Katsina.", W + "Durbar_festival"),
    q(2, "Which agency fights financial crimes in Nigeria?", ["EFCC", "NAFDAC", "FRSC", "NDLEA"], "It was set up in 2003.", W + "Economic_and_Financial_Crimes_Commission"),
    q(3, "The National Theatre in Iganmu, Lagos, is shaped like?", ["A military cap", "A calabash", "A drum", "A boat"], "It was built for FESTAC '77.", W + "National_Theatre,_Lagos"),

    q(1, "In Nigeria, a 'wrapper' is?", ["A cloth tied around the waist", "A sweet wrapper", "A gift box", "A food leaf"], "Wrappers are worn by both women and men.", W + "Wrapper_(clothing)"),
    q(2, "The Osun-Osogbo festival honours which river goddess?", ["Osun", "Yemoja", "Oya", "Olokun"], "The sacred grove is a UNESCO World Heritage Site.", W + "Osun-Osogbo_Sacred_Grove"),
    q(2, "'Whot!' is a popular Nigerian…", ["Card game", "Dance", "Snack", "Hairstyle"], "Players shout 'Last card!' before their final card.", W + "Whot!"),
    q(2, "Which body issues Nigerian passports?", ["Nigeria Immigration Service", "NIMC", "Nigeria Police Force", "Federal Road Safety Corps"], "Passport offices are in every state.", W + "Nigeria_Immigration_Service"),
    q(4, "Freedom Park in Lagos was formerly a?", ["Colonial prison", "Market", "Airport", "Hospital"], "It was Her Majesty's Broad Street Prison.", W + "Freedom_Park,_Lagos"),

    q(2, "'Ayo' is a traditional Yoruba…", ["Board game played with seeds", "Wrestling style", "Drum", "Masquerade"], "It belongs to the mancala family of games.", W + "Oware"),
    q(2, "What does the NDLEA fight?", ["Illegal drugs", "Road accidents", "Fake food and medicine", "Election fraud"], "NDLEA stands for National Drug Law Enforcement Agency.", W + "National_Drug_Law_Enforcement_Agency"),
    q(3, "'Suwe' is the Nigerian children's name for?", ["Hopscotch", "Hide and seek", "Tug of war", "Skipping"], "It's drawn in chalk or scratched into sand.", W + "Hopscotch"),
    q(3, "'Iro and buba' is a traditional Yoruba outfit for?", ["Women", "Men", "Children only", "Chiefs only"], "It's usually finished with a gele.", W + "Buba_(clothing)"),
    q(4, "The Yoruba 'abeti-aja' cap is shaped like?", ["A dog's ears", "A crown", "A boat", "A bird"], "Its name means 'like a dog's ears'.", W + "Fila_(hat)"),
  ],

  "tech-business": [
    q(2, "NIPOST is Nigeria's?", ["Postal service", "Port authority", "Power company", "Pension agency"], "It stands for Nigerian Postal Service.", W + "Nigerian_Postal_Service"),
    q(3, "Who founded Air Peace?", ["Allen Onyema", "Femi Otedola", "Mike Adenuga", "Tony Elumelu"], "The airline launched in 2014.", W + "Air_Peace"),
    q(3, "Which company runs Nigeria's national electricity grid?", ["Transmission Company of Nigeria", "NNPC", "Nigerian Electricity Regulatory Commission", "Rural Electrification Agency"], "It is still government-owned.", W + "Transmission_Company_of_Nigeria"),
    q(4, "Moniepoint was previously known as?", ["TeamApt", "Paga", "Carbon", "Kudi"], "It started out building payment software for banks.", W + "Moniepoint"),
    q(4, "Which Nigerian co-founded both Andela and Flutterwave?", ["Iyinoluwa Aboyeji", "Shola Akinlade", "Jason Njoku", "Tayo Oviosu"], "He later started the venture firm Future Africa.", W + "Iyinoluwa_Aboyeji"),

    q(2, "'Esusu' (or 'ajo') is a traditional?", ["Rotating savings group", "Market day", "Tax", "Bank loan"], "Members contribute regularly and take turns collecting the pot.", W + "Rotating_savings_and_credit_association"),
    q(3, "Which three naira notes were redesigned in late 2022?", ["₦200, ₦500 and ₦1,000", "₦100, ₦200 and ₦500", "₦50, ₦100 and ₦1,000", "₦5, ₦10 and ₦20"], "The switch caused a cash shortage in early 2023.", W + "Nigerian_naira"),
    q(3, "Which body regulates Nigeria's capital market?", ["Securities and Exchange Commission", "Central Bank of Nigeria", "NDIC", "Corporate Affairs Commission"], "Companies must register with it before selling shares to the public.", W + "Securities_and_Exchange_Commission_(Nigeria)"),
    q(4, "Who co-founded Paystack with Shola Akinlade?", ["Ezra Olubi", "Olugbenga Agboola", "Iyinoluwa Aboyeji", "Tosin Eniolorunda"], "Stripe bought Paystack in 2020.", W + "Paystack"),
    q(4, "Kuda, the digital bank, was co-founded by?", ["Babs Ogundeyi", "Tosin Eniolorunda", "Odun Eweniyi", "Mitchell Elegbe"], "Kuda started in 2019.", W + "Kuda_Bank"),

    q(4, "Which agency regulates Nigeria's electricity industry and tariffs?", ["NERC", "NCC", "NNPC", "SON"], "NERC stands for Nigerian Electricity Regulatory Commission.", W + "Nigerian_Electricity_Regulatory_Commission"),
    q(4, "In which year were Nigeria's power distribution and generation companies privatised?", ["2013", "2005", "2010", "2019"], "They had been part of PHCN, formerly NEPA.", W + "Power_Holding_Company_of_Nigeria"),
    q(4, "Innoson Vehicle Manufacturing was founded by?", ["Innocent Chukwuma", "Cosmas Maduka", "Leo Stan Ekeh", "Emeka Offor"], "Its plant is in Nnewi, Anambra State.", W + "Innoson_Vehicle_Manufacturing"),
    q(4, "Which banker, who died in a 2024 helicopter crash, led Access Bank's rise?", ["Herbert Wigwe", "Jim Ovia", "Tony Elumelu", "Femi Otedola"], "The crash happened in California.", W + "Herbert_Wigwe"),
    q(4, "Nigeria's VAT rate was raised in 2020 to?", ["7.5%", "5%", "10%", "15%"], "The change came with the Finance Act 2019.", W + "Value-added_tax"),
  ],
};
