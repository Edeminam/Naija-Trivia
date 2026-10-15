import type { Translation } from "./types";

/**
 * Nigerian Pidgin versions of live questions, keyed by the English question text.
 * Options are in the authored order (correct answer first), exactly like the English bank.
 * Names, titles and numbers stay as they are.
 */
export const PCM: Record<string, Translation> = {
  // ── Nollywood ──────────────────────────────────────────────────────────
  "Nigeria's film industry is popularly known as what?": {
    text: "Wetin people dey call Naija film industry?",
    options: ["Nollywood", "Naijawood", "Lagoswood", "Afriwood"],
    fact: "Naija dey produce films every year pass almost any country for this world.",
  },
  "Which 1992 home video is widely credited with launching the Nollywood boom?": {
    text: "Which 1992 home video people talk say start the Nollywood boom?",
    options: ["Living in Bondage", "Glamour Girls", "Osuofia in London", "Rattlesnake"],
    fact: "Na Kenneth Okonkwo act Andy Okeke for Living in Bondage.",
  },
  "Who played Andy Okeke in the original Living in Bondage?": {
    text: "Who act Andy Okeke for the original Living in Bondage?",
    options: ["Kenneth Okonkwo", "Pete Edochie", "Ramsey Nouah", "Zack Orji"],
    fact: "Kenneth Okonkwo come back play the same role for the 2019 sequel.",
  },
  "Funke Akindele is famous for playing which comic character?": {
    text: "Funke Akindele popular well-well for which comedy character?",
    options: ["Jenifa", "Toyin Tomato", "Mama G", "Aunty Bisi"],
    fact: "Jenifa first show for the 2008 film wey get the same name.",
  },
  "Which reality TV show is hosted by Ebuka Obi-Uchendu?": {
    text: "Which reality TV show Ebuka Obi-Uchendu dey host?",
    options: ["Big Brother Naija", "Nigerian Idol", "Gulder Ultimate Search", "The Voice Nigeria"],
    fact: "Ebuka himself na housemate for the very first season for 2006.",
  },
  "Chinedu Ikedieze and Osita Iheme are famously known as which duo?": {
    text: "Chinedu Ikedieze and Osita Iheme, wetin people dey call the two of them?",
    options: ["Aki and Pawpaw", "Osuofia and Mr Ibu", "Ajasco and Pa James", "Jenifa and Toyosi"],
    fact: "The film wey blow them, Aki na Ukwa, come out for 2002.",
  },
  "Which actor starred as the title character in Osuofia in London?": {
    text: "Which actor play Osuofia for Osuofia in London?",
    options: ["Nkem Owoh", "John Okafor", "Sam Loco Efe", "Victor Osuagwu"],
    fact: "Nkem Owoh still sing the hit song 'I Go Chop Your Dollar'.",
  },
  "The late John Okafor was best known by which screen name?": {
    text: "The late John Okafor, which name people sabi am with for screen?",
    options: ["Mr Ibu", "Osuofia", "Papa Ajasco", "Chief Zebrudaya"],
    fact: "Mr Ibu yeye roles make am one of the comedians wey Nollywood love pass.",
  },
  "Which Kemi Adetiba film follows Lagos crime boss Eniola Salami?": {
    text: "Which Kemi Adetiba film follow Lagos crime boss Eniola Salami?",
    options: ["King of Boys", "The Wedding Party", "Gangs of Lagos", "Brotherhood"],
    fact: "Sola Sobowale collect plenty praise for how she play Eniola Salami.",
  },
  "Who directed and starred in Lionheart (2018)?": {
    text: "Who direct Lionheart (2018) and still act inside am?",
    options: ["Genevieve Nnaji", "Omotola Jalade-Ekeinde", "Funke Akindele", "Mercy Johnson"],
    fact: "Lionheart na the first Naija film wey Netflix buy as Netflix original.",
  },
  "Which comedy is about a lavish Lagos wedding between Dunni and Dozie?": {
    text: "Which comedy na about the big Lagos wedding of Dunni and Dozie?",
    options: ["The Wedding Party", "Chief Daddy", "Isoken", "Merry Men"],
    fact: "The Wedding Party come out for 2016.",
  },
  "Patience Ozokwor is popularly called what?": {
    text: "Wetin people dey call Patience Ozokwor?",
    options: ["Mama G", "Mama Rainbow", "Iya Awero", "Mama Put"],
    fact: "She popular for playing wicked mother-in-law.",
  },

  // ── Afrobeats ──────────────────────────────────────────────────────────
  "Which musician pioneered the Afrobeat genre in the late 1960s and 70s?": {
    text: "Which musician start Afrobeat for late 1960s and 70s?",
    options: ["Fela Kuti", "King Sunny Adé", "Ebenezer Obey", "Victor Olaiya"],
    fact: "Fela mix highlife, jazz, funk and Yoruba rhythm together.",
  },
  "What is Burna Boy's real first name?": {
    text: "Wetin be Burna Boy real first name?",
    options: ["Damini", "Damilola", "Dapo", "David"],
    fact: "Him full name na Damini Ebunoluwa Ogulu.",
  },
  "What is Wizkid's real name?": {
    text: "Wetin be Wizkid real name?",
    options: ["Ayodeji Balogun", "David Adeleke", "Divine Ikubor", "Ahmed Ololade"],
    fact: "Wizkid grow for Surulere, Lagos.",
  },
  "What is Davido's real name?": {
    text: "Wetin be Davido real name?",
    options: ["David Adeleke", "David Ogulu", "David Okoye", "David Ikubor"],
    fact: "Dem born Davido for Atlanta, Georgia, for 1992.",
  },
  "Wizkid featured on which Drake song that topped charts worldwide in 2016?": {
    text: "Which Drake song Wizkid feature for, wey top chart all over the world for 2016?",
    options: ["One Dance", "Hotline Bling", "God's Plan", "Passionfruit"],
    fact: "One Dance become one of the songs wey people stream pass for that time.",
  },
  "Rema's 'Calm Down' got a hit remix featuring which American singer?": {
    text: "Rema 'Calm Down' get one hit remix with which American singer?",
    options: ["Selena Gomez", "Ariana Grande", "Dua Lipa", "Doja Cat"],
    fact: "The remix push Calm Down enter Billboard Hot 100 top 10.",
  },
  "Who founded Mavin Records?": {
    text: "Who start Mavin Records?",
    options: ["Don Jazzy", "D'banj", "Olamide", "Banky W"],
    fact: "Mavin start for 2012.",
  },
  "Olamide is the founder of which record label?": {
    text: "Olamide na the owner of which record label?",
    options: ["YBNL", "Mavin", "DMW", "Chocolate City"],
    fact: "Asake and Fireboy DML both blow from YBNL.",
  },
  "Which twin duo sang 'No One Like You' and 'Personally'?": {
    text: "Which twin brothers sing 'No One Like You' and 'Personally'?",
    options: ["P-Square", "Styl-Plus", "Plantashun Boiz", "Bracket"],
    fact: "P-Square na Peter and Paul Okoye.",
  },
  "Which singer released the classic 'African Queen' in 2004?": {
    text: "Which singer drop the classic 'African Queen' for 2004?",
    options: ["2Baba", "D'banj", "Timaya", "Wande Coal"],
    fact: "Before, people dey call 2Baba '2face Idibia'.",
  },
  "Who is popularly called the 'Queen of Afrobeats'?": {
    text: "Who people dey call 'Queen of Afrobeats'?",
    options: ["Tiwa Savage", "Yemi Alade", "Simi", "Niniola"],
    fact: "Dem born Tiwa Savage for Isale Eko, Lagos.",
  },
  "Which Nigerian singer is known as 'Mama Africa' and had a big 2014 hit called 'Johnny'?": {
    text: "Which Naija singer dem dey call 'Mama Africa', wey get big 2014 hit wey be 'Johnny'?",
    options: ["Yemi Alade", "Tiwa Savage", "Waje", "Seyi Shay"],
    fact: "Johnny video pass 100 million views for YouTube.",
  },

  // ── Football & sports ──────────────────────────────────────────────────
  "What is the nickname of Nigeria's men's national football team?": {
    text: "Wetin dem dey call Naija men national football team?",
    options: ["Super Eagles", "Black Stars", "Super Falcons", "Flying Eagles"],
    fact: "Before late 1980s, dem dey call the team Green Eagles.",
  },
  "What is the nickname of Nigeria's women's national football team?": {
    text: "Wetin dem dey call Naija women national football team?",
    options: ["Super Falcons", "Super Eagles", "Golden Eaglets", "D'Tigress"],
    fact: "Super Falcons na the women team wey don win pass for Africa.",
  },
  "Nigeria's U-17 men's team is nicknamed?": {
    text: "Wetin dem dey call Naija U-17 men team?",
    options: ["Golden Eaglets", "Flying Eagles", "Dream Team", "Young Falcons"],
    fact: "Golden Eaglets don win U-17 World Cup five times. Nobody else do am reach.",
  },
  "Which midfielder was nicknamed 'Jay-Jay'?": {
    text: "Which midfielder dem dey call 'Jay-Jay'?",
    options: ["Augustine Okocha", "Nwankwo Kanu", "Sunday Oliseh", "Mikel John Obi"],
    fact: "Fans dey talk say 'him too good, na why dem call am twice'.",
  },
  "Which Nigerian striker won the 2022–23 Serie A title with Napoli?": {
    text: "Which Naija striker win 2022–23 Serie A with Napoli?",
    options: ["Victor Osimhen", "Ademola Lookman", "Samuel Chukwueze", "Kelechi Iheanacho"],
    fact: "Osimhen na the man wey score pass for Serie A that season.",
  },
  "In which year did Nigeria play at its first FIFA World Cup?": {
    text: "Which year Naija first play for FIFA World Cup?",
    options: ["1994", "1990", "1998", "1982"],
    fact: "Dem play that World Cup for America.",
  },
  "Nigeria won Olympic football gold at which Games?": {
    text: "For which Olympics Naija win football gold?",
    options: ["Atlanta 1996", "Sydney 2000", "Barcelona 1992", "Beijing 2008"],
    fact: "Naija na the first African country wey win Olympic football gold.",
  },
  "Which Nigerian-born basketball legend won two NBA titles with the Houston Rockets?": {
    text: "Which basketball legend wey dem born for Naija win two NBA titles with Houston Rockets?",
    options: ["Hakeem Olajuwon", "Giannis Antetokounmpo", "Dikembe Mutombo", "Joel Embiid"],
    fact: "Dem born Olajuwon for Lagos and na there e grow.",
  },
  "Which UFC champion is nicknamed 'The Nigerian Nightmare'?": {
    text: "Which UFC champion dem dey call 'The Nigerian Nightmare'?",
    options: ["Kamaru Usman", "Israel Adesanya", "Francis Ngannou", "Sodiq Yusuff"],
    fact: "Usman hold the UFC welterweight title.",
  },
  "Israel Adesanya, the UFC middleweight champion, is nicknamed?": {
    text: "Israel Adesanya, the UFC middleweight champion, wetin dem dey call am?",
    options: ["The Last Stylebender", "The Nigerian Nightmare", "The Predator", "Iron Mike"],
    fact: "Dem born Adesanya for Lagos.",
  },
  "Tobi Amusan holds the world record in which event?": {
    text: "Tobi Amusan get world record for which race?",
    options: ["100m hurdles", "400m hurdles", "Long jump", "200m"],
    fact: "She set the record for 2022 World Championships.",
  },
  "Which boxer of Nigerian heritage won Olympic gold at London 2012 and became world heavyweight champion?": {
    text: "Which boxer wey get Naija blood win Olympic gold for London 2012 come become world heavyweight champion?",
    options: ["Anthony Joshua", "Samuel Peter", "Efe Ajagba", "Dillian Whyte"],
    fact: "Joshua family come from Sagamu, Ogun State.",
  },

  // ── History ────────────────────────────────────────────────────────────
  "On what date did Nigeria gain independence?": {
    text: "Which date Naija collect independence?",
    options: ["1 October 1960", "12 June 1960", "29 May 1960", "1 January 1963"],
    fact: "We dey celebrate Independence Day every 1 October.",
  },
  "Which city replaced Lagos as Nigeria's capital in 1991?": {
    text: "Which city take over from Lagos as Naija capital for 1991?",
    options: ["Abuja", "Kaduna", "Ibadan", "Lokoja"],
    fact: "The move become official on 12 December 1991.",
  },
  "What are the colours of the Nigerian flag?": {
    text: "Wetin be the colours for Naija flag?",
    options: ["Green, white, green", "Green, yellow, green", "Green, white, red", "White, green, white"],
    fact: "Green na for the land; white na for peace.",
  },
  "Who designed the Nigerian flag?": {
    text: "Who design Naija flag?",
    options: ["Michael Taiwo Akinkunmi", "Nnamdi Azikiwe", "Herbert Macaulay", "Flora Shaw"],
    fact: "Him be student for London when e submit the design for 1959.",
  },
  "Who was Nigeria's first Prime Minister?": {
    text: "Who be Naija first Prime Minister?",
    options: ["Abubakar Tafawa Balewa", "Nnamdi Azikiwe", "Obafemi Awolowo", "Ahmadu Bello"],
    fact: "Dem dey call Balewa 'Golden Voice of Africa'.",
  },
  "Who was Nigeria's first President?": {
    text: "Who be Naija first President?",
    options: ["Nnamdi Azikiwe", "Abubakar Tafawa Balewa", "Shehu Shagari", "Olusegun Obasanjo"],
    fact: "Azikiwe become President when Naija turn republic for 1963.",
  },
  "How many states does Nigeria have?": {
    text: "How many states Naija get?",
    options: ["36", "37", "30", "38"],
    fact: "Plus the Federal Capital Territory, Abuja.",
  },
  "What is Nigeria's currency?": {
    text: "Wetin be Naija money?",
    options: ["Naira", "Cedi", "Shilling", "Dalasi"],
    fact: "Naira take over from Nigerian pound for 1973.",
  },
  "One naira is divided into 100…": {
    text: "One naira na 100…",
    options: ["Kobo", "Pesewas", "Cents", "Shillings"],
    fact: "People no too dey use kobo coins again these days.",
  },
  "Which Nigerian won the Nobel Prize in Literature in 1986?": {
    text: "Which Naija person win Nobel Prize for Literature for 1986?",
    options: ["Wole Soyinka", "Chinua Achebe", "Ben Okri", "Chimamanda Ngozi Adichie"],
    fact: "Him na the first African wey win the literature prize.",
  },
  "What is the name of the presidential residence in Abuja?": {
    text: "Wetin be the name of where President dey stay for Abuja?",
    options: ["Aso Rock Presidential Villa", "Dodan Barracks", "State House Marina", "Zuma Villa"],
    fact: "Before, government sit for Dodan Barracks for Lagos.",
  },
  "Nigeria's Democracy Day is celebrated on which date?": {
    text: "Which date we dey celebrate Democracy Day for Naija?",
    options: ["12 June", "29 May", "1 October", "15 January"],
    fact: "E move from 29 May go 12 June starting from 2019.",
  },

  // ── Geography ──────────────────────────────────────────────────────────
  "What is the capital of Lagos State?": {
    text: "Wetin be the capital of Lagos State?",
    options: ["Ikeja", "Lagos Island", "Lekki", "Badagry"],
    fact: "Lagos State na the smallest state for land size.",
  },
  "What is the capital of Rivers State?": {
    text: "Wetin be the capital of Rivers State?",
    options: ["Port Harcourt", "Bonny", "Yenagoa", "Uyo"],
    fact: "Dem dey call Port Harcourt 'Garden City'.",
  },
  "What is the capital of Oyo State?": {
    text: "Wetin be the capital of Oyo State?",
    options: ["Ibadan", "Ogbomosho", "Oyo", "Iseyin"],
    fact: "Ibadan na one of the biggest cities for Africa by land size.",
  },
  "What is the capital of Kano State?": {
    text: "Wetin be the capital of Kano State?",
    options: ["Kano", "Kaduna", "Dutse", "Katsina"],
    fact: "Kano na one of the oldest cities for West Africa.",
  },
  "What is the capital of Enugu State?": {
    text: "Wetin be the capital of Enugu State?",
    options: ["Enugu", "Nsukka", "Awka", "Abakaliki"],
    fact: "Dem dey call Enugu 'Coal City'.",
  },
  "What is the capital of Edo State?": {
    text: "Wetin be the capital of Edo State?",
    options: ["Benin City", "Auchi", "Ekpoma", "Asaba"],
    fact: "Benin City na where the old Benin Kingdom sit.",
  },
  "What is the capital of Plateau State?": {
    text: "Wetin be the capital of Plateau State?",
    options: ["Jos", "Bukuru", "Lafia", "Makurdi"],
    fact: "Jos weather cool pass because the place high well-well.",
  },
  "Which two rivers meet at Lokoja?": {
    text: "Which two rivers dey meet for Lokoja?",
    options: ["Niger and Benue", "Niger and Kaduna", "Benue and Gongola", "Ogun and Osun"],
    fact: "Dem dey call Lokoja 'Confluence Town'.",
  },
  "Which is Nigeria's longest river?": {
    text: "Which river long pass for Naija?",
    options: ["River Niger", "River Benue", "Cross River", "River Kaduna"],
    fact: "River Niger na number three longest river for Africa.",
  },
  "Which country borders Nigeria to the west?": {
    text: "Which country dey Naija west side?",
    options: ["Benin", "Togo", "Ghana", "Niger"],
    fact: "Naija other neighbours na Niger, Chad and Cameroon.",
  },
  "Which country borders Nigeria to the east?": {
    text: "Which country dey Naija east side?",
    options: ["Cameroon", "Chad", "Benin", "Gabon"],
    fact: "The border run from Lake Chad reach Gulf of Guinea.",
  },
  "Which body of water does Nigeria's coast face?": {
    text: "Which water Naija coast face?",
    options: ["Gulf of Guinea", "Red Sea", "Indian Ocean", "Mediterranean Sea"],
    fact: "E be part of Atlantic Ocean.",
  },

  // ── Food ───────────────────────────────────────────────────────────────
  "Which rice dish sparks friendly 'wars' between Nigeria and Ghana?": {
    text: "Which rice dey cause friendly 'war' between Naija and Ghana?",
    options: ["Jollof rice", "Fried rice", "Ofada rice", "Coconut rice"],
    fact: "Naija party jollof dey get that smoky 'bottom pot' taste.",
  },
  "Egusi soup is made with ground seeds of which plant?": {
    text: "Na which plant seed dem dey grind make egusi soup?",
    options: ["Melon", "Pumpkin", "Sesame", "Sunflower"],
    fact: "Egusi seed full with protein and oil.",
  },
  "Suya is best described as…": {
    text: "Suya na…",
    options: ["Spicy grilled meat for stick", "Fried beans cake", "Steamed beans pudding", "Fried plantain"],
    fact: "Dem dey use yaji spice am, and groundnut dey inside yaji.",
  },
  "Akara is made mainly from…": {
    text: "Na wetin dem mainly use make akara?",
    options: ["Beans", "Yam", "Corn", "Cassava"],
    fact: "Akara na fried beans ball. People dey chop am with pap or bread.",
  },
  "Moi moi is a…": {
    text: "Moi moi na…",
    options: ["Steamed beans pudding", "Fried yam snack", "Rice cake", "Pepper soup"],
    fact: "Dem dey cook am inside leaf or tin.",
  },
  "Eba is made from which food item?": {
    text: "Na wetin dem dey use make eba?",
    options: ["Garri", "Yam flour", "Rice", "Plantain flour"],
    fact: "Na cassava dem process make garri.",
  },
  "Garri is produced from which crop?": {
    text: "Na which crop dem dey use make garri?",
    options: ["Cassava", "Yam", "Cocoyam", "Maize"],
    fact: "Dem go grate cassava, ferment am, press am, then fry am make garri.",
  },
  "Fried ripe plantain is popularly called?": {
    text: "Wetin we dey call fried ripe plantain?",
    options: ["Dodo", "Boli", "Ipekere", "Ukwa"],
    fact: "Dodo and jollof or beans na perfect match.",
  },
  "Zobo drink is made from which flower?": {
    text: "Na which flower dem dey use make zobo?",
    options: ["Hibiscus (roselle)", "Rose", "Lemongrass", "Moringa"],
    fact: "People dey add ginger, clove and pineapple put for zobo.",
  },
  "Amala is traditionally made from…": {
    text: "Na wetin dem dey use make amala from time?",
    options: ["Yam flour (elubo)", "Cassava flakes", "Rice flour", "Corn starch"],
    fact: "Amala popular for Oyo and the whole South West.",
  },
  "Pounded yam is made by pounding which food?": {
    text: "Na wetin dem dey pound make pounded yam?",
    options: ["Boiled yam", "Raw cassava", "Plantain", "Cocoyam leaves"],
    fact: "From time, na mortar and pestle dem dey take pound am.",
  },
  "Puff-puff is a…": {
    text: "Puff-puff na…",
    options: ["Sweet fried dough ball", "Spicy meat pie", "Steamed rice ball", "Fried beans cake"],
    fact: "Puff-puff na party 'small chops' favourite.",
  },

  // ── Pidgin & slang ─────────────────────────────────────────────────────
  "In Pidgin, what does 'wahala' mean?": {
    text: "For Pidgin, wetin 'wahala' mean?",
    options: ["Trouble", "Food", "Money", "Friend"],
    fact: "'No wahala' mean 'no problem'.",
  },
  "In Pidgin, what does 'abeg' mean?": {
    text: "For Pidgin, wetin 'abeg' mean?",
    options: ["Please", "Go away", "Thank you", "Hurry"],
    fact: "E come from 'I beg'.",
  },
  "The Pidgin greeting 'How far?' means?": {
    text: "When person greet you 'How far?', wetin e mean?",
    options: ["How are you?", "How long is the journey?", "How much?", "Where are you going?"],
    fact: "Many people dey reply 'I dey'.",
  },
  "In Pidgin, what does 'wetin' mean?": {
    text: "For Pidgin, wetin 'wetin' mean?",
    options: ["What", "When", "Where", "Who"],
    fact: "'Wetin dey happen?' mean 'What's going on?'.",
  },
  "In Pidgin, what does 'chop' mean?": {
    text: "For Pidgin, wetin 'chop' mean?",
    options: ["Eat", "Cut", "Sleep", "Dance"],
    fact: "'Chop money' na money for food and upkeep.",
  },
  "In Pidgin, what is a 'pikin'?": {
    text: "For Pidgin, wetin be 'pikin'?",
    options: ["A child", "A pickaxe", "A small bag", "A taxi"],
    fact: "The word fit don come from Portuguese 'pequeno', wey mean small.",
  },
  "In Pidgin, what does 'comot' mean?": {
    text: "For Pidgin, wetin 'comot' mean?",
    options: ["Leave or get out", "Come back", "Sit down", "Hold on"],
    fact: "'Comot for road!' mean 'Get out of the way!'.",
  },
  "Who is an 'oyibo' in Nigerian slang?": {
    text: "For Naija slang, who be 'oyibo'?",
    options: ["A white or foreign person", "A rich uncle", "A police officer", "A taxi driver"],
    fact: "The word come from Yoruba 'oyinbo'.",
  },
  "'I dey come' in Pidgin means?": {
    text: "For Pidgin, wetin 'I dey come' mean?",
    options: ["I'm coming (I'll be right back)", "I'm not coming", "I came yesterday", "Come with me"],
    fact: "People dey talk am even when dem go take long before dem come back.",
  },
  "In Pidgin, what does 'sabi' mean?": {
    text: "For Pidgin, wetin 'sabi' mean?",
    options: ["To know", "To sell", "To save", "To sleep"],
    fact: "'I no sabi' mean 'I don't know'.",
  },
  "In Pidgin, 'Na so' means?": {
    text: "For Pidgin, wetin 'Na so' mean?",
    options: ["That's how it is", "Not like that", "Say it again", "Be quiet"],
    fact: "People dey use am take agree with person.",
  },
  "In Pidgin, 'una' means?": {
    text: "For Pidgin, wetin 'una' mean?",
    options: ["You (plural)", "Us", "One", "Them"],
    fact: "'How una dey?' mean 'How are you all?'.",
  },

  // ── Proverbs & languages ───────────────────────────────────────────────
  "What is Nigeria's official language?": {
    text: "Wetin be Naija official language?",
    options: ["English", "Hausa", "Yoruba", "Pidgin"],
    fact: "Hausa, Yoruba and Igbo na the biggest local languages.",
  },
  "Which three languages are Nigeria's largest indigenous languages?": {
    text: "Which three local languages big pass for Naija?",
    options: ["Hausa, Yoruba and Igbo", "Efik, Tiv and Ijaw", "Edo, Nupe and Kanuri", "Fulfulde, Urhobo and Ibibio"],
    fact: "Each of them get tens of millions of people wey dey speak am.",
  },
  "'Ẹ kú àárọ̀' (E kaaro) is a Yoruba greeting meaning?": {
    text: "'Ẹ kú àárọ̀' (E kaaro) na Yoruba greeting. Wetin e mean?",
    options: ["Good morning", "Good night", "Welcome", "Goodbye"],
    fact: "When you greet elder, you go bow or prostrate.",
  },
  "'Kedu?' is an Igbo greeting meaning?": {
    text: "'Kedu?' na Igbo greeting. Wetin e mean?",
    options: ["How are you?", "Thank you", "Good night", "Come here"],
    fact: "People dey reply 'Ọ dị mma' (E dey fine).",
  },
  "'Sannu' is a Hausa word meaning?": {
    text: "'Sannu' na Hausa word. Wetin e mean?",
    options: ["Hello", "Goodbye", "Sorry, I'm late", "Water"],
    fact: "'Sannu da zuwa' mean 'welcome'.",
  },
  "'Nagode' means what in Hausa?": {
    text: "For Hausa, wetin 'Nagode' mean?",
    options: ["Thank you", "Good morning", "Please", "I love you"],
    fact: "Plenty people dey speak Hausa for northern Naija and Niger.",
  },
  "'Daalụ' means what in Igbo?": {
    text: "For Igbo, wetin 'Daalụ' mean?",
    options: ["Thank you", "Goodbye", "Hello", "Sorry"],
    fact: "You fit still hear 'Imeela'.",
  },
  "'Ẹ ṣé' (E se) means what in Yoruba?": {
    text: "For Yoruba, wetin 'Ẹ ṣé' (E se) mean?",
    options: ["Thank you", "Sorry", "Welcome", "Hurry"],
    fact: "'Ẹ ṣé gan' mean 'thank you very much'.",
  },
  "The Igbo word 'nne' means?": {
    text: "The Igbo word 'nne', wetin e mean?",
    options: ["Mother", "Father", "Child", "Friend"],
    fact: "'Nna' mean father.",
  },
  "The Yoruba word 'ìyá' means?": {
    text: "The Yoruba word 'ìyá', wetin e mean?",
    options: ["Mother", "Sister", "Wife", "Grandmother"],
    fact: "'Bàbá' mean father.",
  },
  "The Igbo name 'Ngozi' means?": {
    text: "The Igbo name 'Ngozi', wetin e mean?",
    options: ["Blessing", "Beauty", "Peace", "Wealth"],
    fact: "Na popular name for girl pikin.",
  },
  "Complete the proverb: 'When two elephants fight, it is the ___ that suffers.'": {
    text: "Finish the proverb: 'When two elephant fight, na the ___ go suffer.'",
    options: ["Grass", "Hunter", "River", "Tree"],
    fact: "E mean say na ordinary people dey suffer when big men dey fight.",
  },

  // ── Naija life ─────────────────────────────────────────────────────────
  "The yellow commercial minibuses of Lagos are called?": {
    text: "Wetin dem dey call the yellow commercial buses for Lagos?",
    options: ["Danfo", "Molue", "Keke", "Okada"],
    fact: "Danfo dey usually yellow with black stripe.",
  },
  "Motorcycle taxis in Nigeria are popularly called?": {
    text: "Wetin we dey call motorcycle taxi for Naija?",
    options: ["Okada", "Danfo", "Keke", "Kabu kabu"],
    fact: "The name come from Okada Air wey don close.",
  },
  "Three-wheeled tricycle taxis are popularly called?": {
    text: "Wetin we dey call the three-leg tricycle taxi?",
    options: ["Keke", "Okada", "Danfo", "Molue"],
    fact: "People still dey call am Keke NAPEP or Keke Marwa.",
  },
  "In Lagos, BRT stands for?": {
    text: "For Lagos, wetin BRT mean?",
    options: ["Bus Rapid Transit", "Bus Route Ticket", "Big Road Transport", "Bus Rail Terminal"],
    fact: "BRT buses get their own lane.",
  },
  "Nigerians still shout 'Up NEPA!' when what happens?": {
    text: "Naija people still dey shout 'Up NEPA!' when wetin happen?",
    options: ["Light don come back", "Team score goal", "Bus don come", "School close"],
    fact: "NEPA na the old name for the light company.",
  },
  "In Nigerian homes, 'gen' is short for?": {
    text: "For Naija house, 'gen' na short for wetin?",
    options: ["Generator", "General", "Gentleman", "Genuine"],
    fact: "Small generator plenty for house because light dey always go.",
  },
  "What does WAEC stand for?": {
    text: "Wetin WAEC mean?",
    options: ["West African Examinations Council", "West African Education Commission", "World African Exam Centre", "West African English Council"],
    fact: "Students dey write WASSCE when dem finish secondary school.",
  },
  "Young graduates doing national service are popularly called?": {
    text: "Wetin we dey call young graduates wey dey do national service?",
    options: ["Corpers", "Cadets", "Trainees", "Interns"],
    fact: "NYSC na one year.",
  },
  "'Aso ebi' is…": {
    text: "'Aso ebi' na…",
    options: ["Same cloth wey guests wear for one event", "Yoruba dance", "Type of soup", "Wedding cake"],
    fact: "Aso ebi mean 'family cloth' for Yoruba.",
  },
  "A 'gele' is a…": {
    text: "'Gele' na…",
    options: ["Head-tie", "Necklace", "Shoe", "Fan"],
    fact: "To tie gele well na art.",
  },
  "An 'agbada' is a…": {
    text: "'Agbada' na…",
    options: ["Big flowing robe for men", "Cap", "Trouser", "Walking stick"],
    fact: "People dey wear am for special occasion.",
  },
  "'Spraying' money at a party means?": {
    text: "Wetin 'spraying' money for party mean?",
    options: ["To dey throw money on celebrants as dem dey dance", "To hide money", "To pay the DJ", "To give charity"],
    fact: "Na must for owambe party.",
  },

  // ── Tech & business ────────────────────────────────────────────────────
  "Which Nigerian has been ranked Africa's richest person for many years?": {
    text: "Which Naija person don be Africa richest man for many years?",
    options: ["Aliko Dangote", "Mike Adenuga", "Femi Otedola", "Tony Elumelu"],
    fact: "Most of him money come from cement, sugar and now oil refinery.",
  },
  "The Dangote Group is best known for producing which product?": {
    text: "Dangote Group popular pass for producing wetin?",
    options: ["Cement", "Cars", "Phones", "Shoes"],
    fact: "Dangote Cement dey work for plenty African countries.",
  },
  "Which telecom company has the most mobile subscribers in Nigeria?": {
    text: "Which telecom company get the most subscribers for Naija?",
    options: ["MTN", "Airtel", "Glo", "9mobile"],
    fact: "MTN enter Naija for 2001.",
  },
  "MTN Group is headquartered in which country?": {
    text: "MTN Group headquarters dey which country?",
    options: ["South Africa", "Nigeria", "Kenya", "Ghana"],
    fact: "MTN Nigeria na the biggest part of the group.",
  },
  "Which Nigerian payments company did Stripe acquire in 2020?": {
    text: "Which Naija payments company Stripe buy for 2020?",
    options: ["Paystack", "Flutterwave", "Interswitch", "Paga"],
    fact: "Na one of the biggest exits for African tech that time.",
  },
  "Andela is known for training and placing which kind of professionals?": {
    text: "Andela popular for training and finding work for which kind professionals?",
    options: ["Software developers", "Nurses", "Pilots", "Chefs"],
    fact: "E start for Lagos for 2014.",
  },
  "Jumia is best known as an…": {
    text: "Jumia na…",
    options: ["Online market", "Airline", "Bank", "Oil company"],
    fact: "Dem dey sell everything from phone reach foodstuff.",
  },
  "Which body regulates banks in Nigeria?": {
    text: "Which body dey control banks for Naija?",
    options: ["Central Bank of Nigeria", "NNPC", "INEC", "NAFDAC"],
    fact: "Na CBN dey print naira too.",
  },
  "Nigeria's main export earner is?": {
    text: "Wetin Naija dey sell abroad pass?",
    options: ["Crude oil", "Cocoa", "Cotton", "Gold"],
    fact: "Oil na most of the money Naija dey make from export.",
  },
  "What does POS stand for in Nigerian payments?": {
    text: "For Naija payments, wetin POS mean?",
    options: ["Point of Sale", "Post Office Service", "Payment Order Slip", "Personal Online Savings"],
    fact: "POS agents dey help people collect cash for their area.",
  },
  "USSD codes like *737# are mostly used for what?": {
    text: "USSD codes like *737#, na for wetin people mostly dey use am?",
    options: ["Mobile banking", "To check weather", "To call police", "To book flight"],
    fact: "Dem dey work even without internet.",
  },
  "What is the symbol of the naira?": {
    text: "Wetin be naira symbol?",
    options: ["₦", "₵", "N$", "₤"],
    fact: "₵ na the symbol for Ghana cedi.",
  },
};
