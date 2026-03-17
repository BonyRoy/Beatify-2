/**
 * Correct Beatify Tracks Taxonomy
 * Applies master list: Genres, Languages, Moods, Song Types
 * Output: beatify-tracks-corrected-YYYY-MM-DD.xlsx
 */

import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============ MASTER TAXONOMY ============
const GENRES = {
  core: ['Pop', 'Rock', 'Hip-Hop / Rap', 'EDM', 'Classical', 'Jazz', 'Blues', 'Country', 'Folk', 'Indie'],
  indian: ['Bollywood', 'Indie Hindi', 'Punjabi Pop', 'Marathi Pop', 'Tamil / Telugu Film Music', 'Devotional (Bhajan / Aarti / Kirtan)', 'Sufi', 'Ghazal'],
  sub: ['Dance Pop', 'Indie Rock', 'Trap', 'Lo-fi', 'House', 'Techno', 'Acoustic', 'Retro / Old Classics']
};

const LANGUAGES = ['English', 'Hindi', 'Marathi', 'Punjabi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Spanish', 'French', 'Korean', 'Japanese', 'Arabic'];

const MOODS = {
  emotional: ['Romantic', 'Love', 'Heartbreak', 'Sad', 'Soulful', 'Longing'],
  energy: ['Party', 'Peppy', 'Energetic', 'Dance', 'Hype', 'Aggressive'],
  social: ['Friendship / Dosti', 'Chill', 'Feel Good', 'Happy', 'Carefree'],
  other: ['Motivational', 'Spiritual', 'Nostalgic', 'Emotional', 'Dark']
};

const SONG_TYPES = {
  entertainment: ['Party Song', 'Item Song', 'Dance Number', 'Club Song'],
  relationship: ['Romantic Song', 'Breakup Song', 'Proposal Song', 'Wedding Song'],
  social: ['Friendship Song', 'Family Song'],
  film: ['Intro Song', 'Background Song', 'Celebration Song'],
  other: ['Devotional', 'Motivational', 'Sad Song', 'Travel Song']
};

// ============ KNOWN SONG MAPPINGS (exact match) ============
const KNOWN_SONGS = {
  'Dance Pe Chance': { genre: ['Bollywood', 'Dance Pop'], language: ['Hindi'], mood: ['Peppy', 'Energetic', 'Party', 'Dance', 'Happy'], type: ['Party Song', 'Dance Number', 'Club Song'] },
  'BIBA': { genre: ['Bollywood', 'Dance Pop'], language: ['Hindi', 'English'], mood: ['Peppy', 'Party', 'Dance', 'Happy'], type: ['Party Song', 'Dance Number'] },
  'Despacito': { genre: ['Pop', 'Dance Pop'], language: ['Spanish'], mood: ['Romantic', 'Peppy', 'Feel Good'], type: ['Romantic Song'] },
  'Munni Badnaam Hui': { genre: ['Bollywood', 'Dance Pop'], language: ['Hindi'], mood: ['Party', 'Peppy', 'Energetic', 'Dance'], type: ['Item Song', 'Dance Number', 'Party Song'] },
  'Sheila Ki Jawani': { genre: ['Bollywood', 'Dance Pop'], language: ['Hindi'], mood: ['Party', 'Peppy', 'Energetic', 'Dance'], type: ['Item Song', 'Dance Number', 'Party Song'] },
  'Oo Antava Oo Oo Antava': { genre: ['Tamil / Telugu Film Music', 'Dance Pop'], language: ['Telugu'], mood: ['Party', 'Peppy', 'Dance'], type: ['Item Song', 'Dance Number'] },
  'Ek Do Teen': { genre: ['Bollywood', 'Dance Pop'], language: ['Hindi'], mood: ['Peppy', 'Energetic', 'Dance'], type: ['Item Song', 'Dance Number'] },
  'Kala Chashma': { genre: ['Bollywood', 'Dance Pop'], language: ['Hindi'], mood: ['Party', 'Peppy', 'Dance', 'Happy'], type: ['Party Song', 'Dance Number'] },
  'Abhi Toh Party Shuru Hui Hai': { genre: ['Bollywood', 'Dance Pop'], language: ['Hindi'], mood: ['Party', 'Peppy', 'Energetic', 'Hype'], type: ['Party Song', 'Club Song'] },
  'Dilli Wali Girlfriend': { genre: ['Bollywood', 'Dance Pop'], language: ['Hindi'], mood: ['Peppy', 'Party', 'Happy'], type: ['Party Song', 'Romantic Song'] },
  'Namo Namo': { genre: ['Bollywood', 'Devotional (Bhajan / Aarti / Kirtan)'], language: ['Hindi'], mood: ['Spiritual', 'Soulful'], type: ['Devotional'] },
  'Deva Shree Ganesha': { genre: ['Bollywood', 'Devotional (Bhajan / Aarti / Kirtan)'], language: ['Hindi'], mood: ['Spiritual', 'Energetic'], type: ['Devotional', 'Celebration Song'] },
  'Har Har Gange': { genre: ['Bollywood', 'Devotional (Bhajan / Aarti / Kirtan)'], language: ['Hindi'], mood: ['Spiritual', 'Soulful'], type: ['Devotional'] },
  'Shiv Tandav': { genre: ['Bollywood', 'Devotional (Bhajan / Aarti / Kirtan)'], language: ['Hindi'], mood: ['Spiritual', 'Energetic', 'Aggressive'], type: ['Devotional'] },
  'Dangal ( Title Track )': { genre: ['Bollywood'], language: ['Hindi'], mood: ['Motivational', 'Energetic'], type: ['Motivational'] },
  'Kar Har Maidan Fateh': { genre: ['Bollywood'], language: ['Hindi'], mood: ['Motivational', 'Energetic', 'Hype'], type: ['Motivational'] },
  'Challa (Main Lad Jaana)': { genre: ['Bollywood'], language: ['Hindi'], mood: ['Motivational', 'Energetic'], type: ['Motivational'] },
  'Ud-Daa Punjab (Title Track)': { genre: ['Bollywood', 'Punjabi Pop'], language: ['Punjabi', 'Hindi'], mood: ['Energetic', 'Aggressive'], type: ['Intro Song'] },
  'Zindagi Kuch Toh Bata': { genre: ['Bollywood'], language: ['Hindi'], mood: ['Sad', 'Soulful', 'Longing'], type: ['Sad Song'] },
  'Tum Se Hi': { genre: ['Bollywood'], language: ['Hindi'], mood: ['Romantic', 'Love', 'Soulful'], type: ['Romantic Song'] },
  'Agar Tum Saath Ho': { genre: ['Bollywood'], language: ['Hindi'], mood: ['Romantic', 'Sad', 'Soulful'], type: ['Romantic Song'] },
  'Perfect': { genre: ['Pop', 'Acoustic'], language: ['English'], mood: ['Romantic', 'Love', 'Feel Good'], type: ['Romantic Song', 'Proposal Song'] },
  '500 Miles': { genre: ['Folk'], language: ['English'], mood: ['Feel Good', 'Happy', 'Nostalgic'], type: ['Travel Song'] },
  'Last Christmas': { genre: ['Pop'], language: ['English'], mood: ['Romantic', 'Nostalgic', 'Feel Good'], type: ['Romantic Song'] },
  'Let It Go': { genre: ['Pop'], language: ['English'], mood: ['Motivational', 'Feel Good'], type: ['Background Song'] },
  'We Don\'t Talk About Bruno': { genre: ['Pop'], language: ['Spanish'], mood: ['Peppy', 'Energetic', 'Dark'], type: ['Background Song'] },
  'Havana': { genre: ['Pop', 'Dance Pop'], language: ['English', 'Spanish'], mood: ['Chill', 'Romantic', 'Feel Good'], type: ['Romantic Song'] },
  'Shape of you X Naina': { genre: ['Bollywood', 'Pop'], language: ['Hindi', 'English'], mood: ['Peppy', 'Romantic', 'Dance'], type: ['Romantic Song'] },
};

// Indian artist names (for language detection)
const INDIAN_ARTISTS = ['Arijit Singh', 'Kishore Kumar', 'Lata Mangeshkar', 'Sonu Nigam', 'Shreya Ghoshal', 'Atif Aslam', 'A.R. Rahman', 'Pritam', 'Vishal-Shekhar', 'Sunidhi Chauhan', 'Neha Kakkar', 'Badshah', 'Honey Singh', 'Diljit Dosanjh', 'AP Dhillon', 'King', 'Shankar Mahadevan', 'KK', 'Mohammed Rafi', 'Udit Narayan', 'Alka Yagnik', 'Rahat Fateh Ali Khan', 'Amit Trivedi', 'Ajay-Atul', 'Himesh Reshammiya', 'Mika Singh', 'Meet Bros', 'Sukhwinder Singh', 'Daler Mehndi', 'Kumar Sanu', 'Abhijeet Bhattacharya', 'Lucky Ali', 'Papon', 'Armaan Malik', 'Jubin Nautiyal', 'Vishal Dadlani', 'Benny Dayal', 'Asees Kaur', 'Palak Muchhal', 'Neeti Mohan', 'Tulsi Kumar', 'Javed Ali', 'Shalmali Kholgade', 'Jonita Gandhi', 'Aditya Rikhari', 'Parampara Tandon', 'Mamta Sharma', 'Indravathi Chauhan', 'Madhubanti Bagchi', 'Alisha Chinai', 'Hema Sardesai', 'Anu Malik', 'Kunal Ganjawala', 'Ankit Tiwari', 'Sona Mohapatra', 'Guru Randhawa', 'Karan Aujla', 'Hansraj Raghuwanshi', 'Rabbi Shergill', 'Zubeen Garg', 'Mustafa Zahid', 'Faheem Abdullah', 'Shahzad Ali', 'Simran Choudhary', 'Jasmine Sandlas', 'Sachet Tandon', 'Nakash Aziz', 'Amit Mishra', 'Talwiinder', 'Harnoor', 'Omer Inayat', 'DC Madana', 'Aparshakti Khurana', 'S. P. Balasubrahmanyam', 'K. S. Chithra', 'Meghna Erande', 'Sonal Kaushal', 'Aparna Ullal', 'Taz (Stereo Nation)', 'Arash', 'Hassan Jahangir', 'Adnan Sami', 'Sajid Wajid', 'Amrita Kak', 'Yashita Sharma', 'Manish Kumar Tipu', 'Farhan', 'Aastha Gill', 'Jaspinder Narula', 'Shweta Pandit', 'Zack Knight', 'Jasmin Walia', 'Benny Dayal', 'Shraddha Pandit', 'Pawni Pandey', 'Dev Negi', 'Harshit Saxena', 'Anupama Chakraborty Shrivastava', 'Vishal Mishra', 'Loy Mendonsa', 'Tarun Sagar', 'Alyssa Mendonsa', 'Maria del Mar Fernandez', 'Farhan Akhtar', 'Hrithik Roshan', 'Abhay Deol', 'Vivek Hariharan', 'Romy', 'Shashwat Sachdev', 'Siddharth Mahadevan', 'Shilpa Rao', 'Divya Kumar', 'Chinmayi Sripada', 'Shekhar Ravjiani', 'Suraj Jagan', 'Mahalakshmi Iyer', 'Aishwarya Nigam', 'Sumonto Mukherjee', 'Romy', 'Paresh Pahuja', 'Salim Merchant', 'Sneha Pant', 'Kailash Kher', 'Madhushree', 'Shaan', 'Anup Ghoshal', 'Ravi Shankar', 'Ajay-Atul', 'Vishal–Shekhar', 'Asrar', 'Tayc'];

// Spanish/Latin artists
const SPANISH_ARTISTS = ['Luis Fonsi', 'Shakira', 'Camila Cabello', 'Enrique Iglesias', 'Carolina Gaitán', 'Mauro Castillo', 'Adassa', 'Anthony Gonzalez', 'Gael García Bernal', 'Farruko', 'Young Thug'];

// Film/album keywords for language
const HINDI_ALBUMS = ['Bajrangi Bhaijaan', 'Dabangg', 'Don', 'Karz', 'Dil Chahta Hai', 'Jab We Met', 'Main Hoon Na', 'Dangal', 'Sultan', 'Udta Punjab', 'Sanju', 'Jawan', 'Pushpa', 'KGF', 'Brahmāstra', 'Dhurandhar', 'Do Patti', 'Raid 2', 'Hanuman', 'Kedarnath', 'Agneepath', 'Dishoom', 'Chennai Express', 'Happy New Year', 'Zindagi Na Milegi Dobara', 'Yeh Jawaani Hai Deewani', 'Tamasha', 'Rocky Aur Rani Kii Prem Kahaani', 'Kabir Singh', 'Simmba', 'Guru', 'Raaz', 'Gangster', 'Zeher', 'Murder', 'Lakshya', 'Parineeta', 'Masoom', 'Gol Maal', 'Saagar', 'Phantom', 'Khoobsurat', 'Dil Dhadakne Do', 'Ek Paheli Leela', 'Bareilly Ki Barfi', 'Baar Baar Dekho', 'Ramaiya Vastavaiya', 'Ki & Ka', 'Partner', 'Khiladi 786', 'Sonu Ke Titu Ki Sweety', 'Jab We Met', 'Aitraaz', 'Aashiq Banaya Aapne', 'Aap Kaa Surroor', 'Housefull', 'God Tussi Great Ho', 'Blood Money', 'Chalte Chalte', 'I Hate Luv Storys', 'Heroine', 'Dulhan Hum Le Jayenge', 'Sunny Sanskari Ki Tulsi Kumari', 'Blackmail', 'Housefull', 'Sunoh', 'Khiladi 786', 'Kabhi Alvida Na Kehna', 'Super 30', 'Jurm', 'Pyaar Ke Side Effects', 'Josh', 'Bala', 'Jannat 2', 'Anjaana Anjaani', 'Jhankaar Beats', 'A Soldier Is Never Off Duty', 'Dishkiyaoon', 'Zara Hatke Zara Bachke', 'The Carnival', 'Chandni Chowk to China', 'Prince', 'Delhi Heights', 'Ajab Prem Ki Ghazab Kahani', 'The Killer', 'Guzaarish', 'Hate Story 3', 'Metro... In Dino', 'Yamla Pagla Deewana', 'Monica, O My Darling', 'Fukrey', 'Vighnaharta', 'Banjo', 'Goodbye', 'Badrinath Ki Dulhania', 'Hanuman Returns', 'Vida', 'Roja', 'Stree 2', 'Bad Newz', 'Jagga Jasoos', 'Kesari', 'Hasee Toh Phasee', 'Beyblade Metal Fusion', 'Eurovision Song Contest 2010', 'Ok Jaanu', 'BA Pass 2', 'Hero Splendor', 'Raid 2', 'Do Patti', 'Dhurandhar', 'Saiyaara A', 'URI: The Surgical Strike', 'Mary Kom'];

// Keywords for categorization
const ITEM_SONG_KEYWORDS = ['munni', 'sheila', 'antava', 'ek do teen', 'chikni chameli', 'fevicol', 'nakhre', 'jawani', 'badnaam', 'item'];
const PARTY_KEYWORDS = ['party', 'dance', 'nach', 'disco', 'club', 'boom', 'mauja', 'peppy', 'shuru', 'raat', 'night', 'hookah', 'lat lag', 'kala chashma', 'high heels', 'galat baat', 'one two three four', 'abhi toh party', 'dilli wali', 'senorita', 'afghan jalebi', 'saiya superstar', 'gallan goodiyan', 'dance pe chance', 'biba', 'boom diggy', 'jadoo ki jhappi', 'gali gali', 'soni de nakhre', 'loot le gaya', 'ramba ho'];
const ROMANTIC_KEYWORDS = ['pyaar', 'pyar', 'ishq', 'dil', 'prem', 'aashiqui', 'tum se', 'tere', 'tujhse', 'love', 'romantic', 'yaad', 'sapna', 'khwab', 'manwa', 'teri', 'tu hi', 'tumhe', 'saath', 'milna', 'mohabbat', 'jaan', 'sajan', 'saiya', 'saaiyaan', 've maahi', 'phir aur kya', 'tu aake', 'tere bin', 'tere bina', 'tum se hi', 'agar tum saath', 'perfect', 'pal pal', 'o sanam', 'safarnama', 'zehnaseeb', 'tu jaane na', 'deva deva', 'man meri jaan', 'teriyan', 'sahiba', 'naal nachna', 'raanjhan', 'nasha', 'bure bure', 'bheegey hont', 'sau tarah ke', 'selfie le le', 'ambarsariya', 'yeh ek zindagi', 'tu jaane na', 'deva deva', 'meri umar', 'ok jaanu', 'manwa laage', 'dil to pagal', 'teri yaadon', 'tumhe sochta', 'tujhe bhula', 'tu aashiqui', 'pehla pyaar', 'tu hi meri shab', 'tu hi hai aashiqui', 'phir aur kya chahiye', 'tu aake dekhle', 'tere naina', 'tere liye', 'tere bin', 'tera hone laga', 'tera deedar', 'surili akhiyo', 'srivalli', 'soniyo', 'so gaya yeh jahan', 've kamleya', 'zamaana lage', 'teri yaadon se', 'tauba tumhare', 'sadka', 'saaiyaan', 'pyar dilo ka mela', 'pal pal dil ke paas', 'oh girl you\'re mine', 'o sanam', 'long drive', 'kabhi alvida', 'jugraafiya', 'jab koi baat', 'jaane kya', 'ice cream khaungi', 'hai mera dil', 'gehra hua', 'dream girl', 'dooron dooron', 'dard-e-dil', 'aye khuda', 'agar main kahoon', 'abhi abhi', 'zindagi kuch toh bata', 'zehnaseeb', 'zaroor', 'yimmy yimmy', 'ye shaam mastani', 'ye haseen vadiyan', 'ya ali', 'woh lamhe', 'wakhra swag', 'wada karo', 'waalian', 've maahi', 'ullu ka pattha', 'udi teri aankhon', 'tumhe apna banane', 'tum se hi', 'tumhe sochta hoon', 'tujhe bhula diya', 'aksa beach', 'tu aashiqui hai', 'pehla pyaar', 'tu hi toh hai', 'tu hi meri shab hai', 'tu hi hai aashiqui', 'phir aur kya chahiye', 'tu aake dekhle', 'tomake chai', 'thodi si daru', 'teri yaadon mein', 'tere naina', 'tere liye', 'tere bin', 'tere bina', 'tere bin sanu soniya', 'tera hone laga hoon', 'tera deedar hua', 'surili akhiyo wale', 'srivalli', 'soniyo', 'so gaya yeh jahan', 'neeche phoolon', 'manwa laage', 'mujhe yaad sataye', 'main aisa kyun', 'gela gela gela', 'woh ladki hai kahan', 'dil to pagal hai', 'aa aashiq mein teri', 'tumse milke', 'tera suroor', 'sweety tera drama', 'hoor', 'bheegey hont tere', 'saiyaara', 'ishq jalakar', 'raanjhan', 'naal nachna', 'nasha', 'sau tarah ke', 'selfie le le re', 'tu jaane na', 'teriyan adavaan', 'sahiba', 'deva deva', 'meri umar ke naujawano', 'yeh ek zindagi', 'ambarsariya', 'kaise paheli', 'chal ta rahe', 'shape of you x naina', 'perfect', 'biba', 'tauba tauba', 'pal pal', 'perfect'];
const DEVOTIONAL_KEYWORDS = ['namo', 'deva', 'ganesha', 'har har', 'shiv tandav', 'jai kaal', 'mahabali', 'ekadantaya', 'bappa', 'aasma ko chukar'];
const MOTIVATIONAL_KEYWORDS = ['dangal', 'kar har maidan', 'challa', 'ud-daa punjab', 'sultan', 'ziddi dil', 'bulleya', 'fateh', 'maidan'];
const GYM_KEYWORDS = ['dangal', 'sultan', 'challa', 'ziddi', 'ud-daa', 'kar har', 'shiv tandav', 'bulleya', 'maidan', 'fateh'];
const FRIENDSHIP_KEYWORDS = ['dosti', 'dost', 'yaar', 'friend', 'koi kahe', 'dil chahta'];
const SAD_KEYWORDS = ['tujhe bhula', 'heartbreak', 'dard', 'dukh', 'ronaa', 'aansoo', 'kabhi alvida', 'zindagi kuch toh', 'agar tum saath'];
const SUFI_KEYWORDS = ['bulleya', 'ya ali', 'sufi', 'qawwali'];
const PUNJABI_KEYWORDS = ['ud-daa', 'punjab', 'guru randhawa', 'diljit', 'diljit dosanjh', 'badshah', 'honey singh', 'karan aujla', 'ap dhillon', 'teriyan', 'tauba tauba', 'pal pal', 'waalian', 'harnoor'];
const TAMIL_TELUGU_KEYWORDS = ['pushpa', 'srivalli', 'oo antava', 'antava', 'roja', 'ye haseen vadiyan', 'tamil', 'telugu', 'malayalam', 'kannada', 'kgf', 'ramba ho', 'gali gali'];

function normalize(str) {
  return (str || '').toLowerCase().trim();
}

function getLanguage(name, artist, album) {
  const n = normalize(name);
  const a = normalize(artist || '');
  const alb = normalize(album || '');
  const combined = `${n} ${a} ${alb}`;
  const langs = [];

  if (SPANISH_ARTISTS.some(ar => a.includes(normalize(ar))) || n.includes('despacito') || n.includes('bruno') || n.includes('havana') || n.includes('coco') || n.includes('encanto') || n.includes('un poco loco') || n.includes('remember me')) {
    langs.push('Spanish');
  }
  if (n.includes('naina') && (a.includes('ed sheeran') || a.includes('diljit'))) {
    langs.push('Hindi', 'English');
  }
  if (PUNJABI_KEYWORDS.some(k => combined.includes(k)) || a.includes('guru randhawa') || a.includes('diljit') || a.includes('badshah') || a.includes('honey singh') || a.includes('karan aujla') || a.includes('ap dhillon')) {
    if (!langs.includes('Punjabi')) langs.push('Punjabi');
  }
  if (TAMIL_TELUGU_KEYWORDS.some(k => combined.includes(k)) || alb.includes('pushpa') || alb.includes('roja') || alb.includes('kgf')) {
    if (alb.includes('pushpa') && n.includes('srivalli')) langs.push('Telugu');
    else if (alb.includes('oo antava') || n.includes('antava')) langs.push('Telugu');
    else if (alb.includes('roja') || alb.includes('kgf')) langs.push('Tamil');
  }
  if (HINDI_ALBUMS.some(k => alb.includes(normalize(k))) || INDIAN_ARTISTS.some(ar => a.includes(normalize(ar))) || /[\u0900-\u097F]/.test(name + artist)) {
    if (!langs.includes('Hindi')) langs.push('Hindi');
  }
  if (a.includes('marathi') || alb.includes('marathi')) {
    langs.push('Marathi');
  }
  if (!langs.length) {
    // Default: English for Western, Hindi for Bollywood
    if (alb.includes('bollywood') || a.includes('kishore') || a.includes('lata') || a.includes('arijit') || a.includes('sonu') || a.includes('shreya') || a.includes('atif') || a.includes('rahman') || a.includes('pritam')) {
      langs.push('Hindi');
    } else {
      langs.push('English');
    }
  }
  return langs.length ? langs : ['English'];
}

function getGenre(name, artist, album, oldGenre) {
  const n = normalize(name);
  const a = normalize(artist || '');
  const alb = normalize(album || '');
  const old = normalize(oldGenre || '');

  const genres = [];

  // Indian film music
  if (HINDI_ALBUMS.some(k => alb.includes(normalize(k))) || INDIAN_ARTISTS.some(ar => a.includes(normalize(ar))) || old.includes('bollywood')) {
    genres.push('Bollywood');
  }
  if (DEVOTIONAL_KEYWORDS.some(k => n.includes(k) || alb.includes(k))) {
    genres.push('Devotional (Bhajan / Aarti / Kirtan)');
  }
  if (SUFI_KEYWORDS.some(k => n.includes(k))) {
    genres.push('Sufi');
  }
  if (PUNJABI_KEYWORDS.some(k => a.includes(k) || n.includes(k))) {
    genres.push('Punjabi Pop');
  }
  if (TAMIL_TELUGU_KEYWORDS.some(k => combined.includes(k)) || alb.includes('pushpa') || alb.includes('roja') || alb.includes('kgf')) {
    genres.push('Tamil / Telugu Film Music');
  }

  // Western
  if (old.includes('rock') || old.includes('metal') || old.includes('alternative')) {
    genres.push('Rock');
    if (old.includes('nu metal') || old.includes('rap metal')) genres.push('Hip-Hop / Rap');
  }
  if (old.includes('hip hop') || old.includes('rap')) {
    genres.push('Hip-Hop / Rap');
  }
  if (old.includes('edm') || old.includes('electronic') || old.includes('house') || old.includes('dance-pop')) {
    genres.push('EDM');
  }
  if (old.includes('jazz')) {
    genres.push('Jazz');
  }
  if (old.includes('country') || old.includes('folk')) {
    genres.push('Country');
  }
  if (old.includes('folk')) {
    genres.push('Folk');
  }
  if (old.includes('pop') && !genres.length) {
    genres.push('Pop');
  }
  if (old.includes('acoustic')) {
    genres.push('Acoustic');
  }
  if (old.includes('latin') || old.includes('mariachi')) {
    genres.push('Pop');
  }
  if (old.includes('musical')) {
    genres.push('Pop');
  }

  // Dance/Party
  if (PARTY_KEYWORDS.some(k => n.includes(k)) || ITEM_SONG_KEYWORDS.some(k => n.includes(k)) || (old.includes('party') || old.includes('pop')) && (PARTY_KEYWORDS.some(k => n.includes(k)))) {
    if (!genres.includes('Dance Pop')) genres.push('Dance Pop');
  }
  if (GYM_KEYWORDS.some(k => n.includes(k)) || old.includes('gym')) {
    // Motivational / Energetic Bollywood
    if (!genres.includes('Bollywood')) genres.push('Bollywood');
  }

  if (!genres.length) {
    if (old.includes('bollywood')) genres.push('Bollywood');
    else genres.push('Pop');
  }
  return genres;
}

function getMood(name, artist, album, oldGenre) {
  const n = normalize(name);
  const moods = [];

  if (PARTY_KEYWORDS.some(k => n.includes(k)) || ITEM_SONG_KEYWORDS.some(k => n.includes(k))) {
    moods.push('Party', 'Peppy', 'Energetic', 'Dance');
  }
  if (ROMANTIC_KEYWORDS.some(k => n.includes(k)) && !PARTY_KEYWORDS.some(k => n.includes(k))) {
    moods.push('Romantic', 'Love');
  }
  if (DEVOTIONAL_KEYWORDS.some(k => n.includes(k))) {
    moods.push('Spiritual');
  }
  if (MOTIVATIONAL_KEYWORDS.some(k => n.includes(k)) || GYM_KEYWORDS.some(k => n.includes(k))) {
    moods.push('Motivational', 'Energetic');
  }
  if (FRIENDSHIP_KEYWORDS.some(k => n.includes(k))) {
    moods.push('Friendship / Dosti');
  }
  if (SAD_KEYWORDS.some(k => n.includes(k))) {
    moods.push('Sad', 'Soulful');
  }
  if (n.includes('happy') || n.includes('mauja') || n.includes('masti')) {
    moods.push('Happy', 'Feel Good');
  }
  if (n.includes('chill') || n.includes('safarnama')) {
    moods.push('Chill', 'Soulful');
  }
  if (n.includes('nostalgic') || n.includes('last christmas') || n.includes('500 miles')) {
    moods.push('Nostalgic');
  }

  if (!moods.length) {
    if (normalize(oldGenre || '').includes('romantic')) moods.push('Romantic', 'Love');
    else if (normalize(oldGenre || '').includes('party')) moods.push('Party', 'Peppy');
    else moods.push('Feel Good');
  }
  return moods;
}

function getSongType(name, oldGenre) {
  const n = normalize(name);
  const types = [];

  if (ITEM_SONG_KEYWORDS.some(k => n.includes(k))) {
    types.push('Item Song', 'Dance Number', 'Party Song');
  }
  if (PARTY_KEYWORDS.some(k => n.includes(k))) {
    types.push('Party Song', 'Dance Number');
  }
  if (DEVOTIONAL_KEYWORDS.some(k => n.includes(k))) {
    types.push('Devotional');
  }
  if (MOTIVATIONAL_KEYWORDS.some(k => n.includes(k)) || GYM_KEYWORDS.some(k => n.includes(k))) {
    types.push('Motivational');
  }
  if (ROMANTIC_KEYWORDS.some(k => n.includes(k)) && !PARTY_KEYWORDS.some(k => n.includes(k))) {
    types.push('Romantic Song');
  }
  if (SAD_KEYWORDS.some(k => n.includes(k))) {
    types.push('Sad Song');
  }
  if (FRIENDSHIP_KEYWORDS.some(k => n.includes(k))) {
    types.push('Friendship Song');
  }
  if (n.includes('title track') || n.includes('opening') || n.includes('intro')) {
    types.push('Intro Song');
  }
  if (n.includes('background') || n.includes('frozen') || n.includes('moana') || n.includes('encanto') || n.includes('coco')) {
    types.push('Background Song');
  }
  if (n.includes('celebration') || n.includes('bappa') || n.includes('ganesha')) {
    types.push('Celebration Song');
  }

  if (!types.length) {
    if (normalize(oldGenre || '').includes('romantic')) types.push('Romantic Song');
    else if (normalize(oldGenre || '').includes('party')) types.push('Party Song');
    else types.push('Background Song');
  }
  return types;
}

function correctTrack(row) {
  const name = row[0];
  const artist = row[1];
  const oldGenre = row[2];
  const album = row[3];
  const combined = normalize(`${name} ${artist} ${album}`);

  // Check known mappings first
  const known = KNOWN_SONGS[name?.trim()];
  if (known) {
    return {
      genre: known.genre.join(', '),
      language: known.language.join(', '),
      mood: known.mood.join(', '),
      type: known.type.join(', ')
    };
  }

  const genre = getGenre(name, artist, album, oldGenre);
  const language = getLanguage(name, artist, album);
  const mood = getMood(name, artist, album, oldGenre);
  const type = getSongType(name, oldGenre);

  return {
    genre: [...new Set(genre)].join(', '),
    language: [...new Set(language)].join(', '),
    mood: [...new Set(mood)].join(', '),
    type: [...new Set(type)].join(', ')
  };
}

// Fix getGenre - combined was undefined
function getGenreFixed(name, artist, album, oldGenre) {
  const n = normalize(name);
  const a = normalize(artist || '');
  const alb = normalize(album || '');
  const old = normalize(oldGenre || '');
  const combined = `${n} ${a} ${alb}`;

  const genres = [];

  if (HINDI_ALBUMS.some(k => alb.includes(normalize(k))) || INDIAN_ARTISTS.some(ar => a.includes(normalize(ar))) || old.includes('bollywood')) {
    genres.push('Bollywood');
  }
  if (DEVOTIONAL_KEYWORDS.some(k => n.includes(k) || alb.includes(k))) {
    genres.push('Devotional (Bhajan / Aarti / Kirtan)');
  }
  if (SUFI_KEYWORDS.some(k => n.includes(k))) {
    genres.push('Sufi');
  }
  if (PUNJABI_KEYWORDS.some(k => a.includes(k) || n.includes(k))) {
    genres.push('Punjabi Pop');
  }
  if (TAMIL_TELUGU_KEYWORDS.some(k => combined.includes(k)) || alb.includes('pushpa') || alb.includes('roja') || alb.includes('kgf')) {
    genres.push('Tamil / Telugu Film Music');
  }
  if (old.includes('rock') || old.includes('metal') || old.includes('alternative')) {
    genres.push('Rock');
    if (old.includes('nu metal') || old.includes('rap metal')) genres.push('Hip-Hop / Rap');
  }
  if (old.includes('hip hop') || old.includes('rap')) {
    genres.push('Hip-Hop / Rap');
  }
  if (old.includes('edm') || old.includes('electronic') || old.includes('house') || old.includes('dance-pop')) {
    genres.push('EDM');
  }
  if (old.includes('jazz')) {
    genres.push('Jazz');
  }
  if (old.includes('country')) {
    genres.push('Country');
  }
  if (old.includes('folk')) {
    genres.push('Folk');
  }
  if (old.includes('pop') && !genres.length) {
    genres.push('Pop');
  }
  if (old.includes('acoustic')) {
    genres.push('Acoustic');
  }
  if (old.includes('latin') || old.includes('mariachi')) {
    genres.push('Pop');
  }
  if (old.includes('musical')) {
    genres.push('Pop');
  }
  if (PARTY_KEYWORDS.some(k => n.includes(k)) || ITEM_SONG_KEYWORDS.some(k => n.includes(k))) {
    if (!genres.includes('Dance Pop')) genres.push('Dance Pop');
  }
  if (GYM_KEYWORDS.some(k => n.includes(k)) || old.includes('gym')) {
    if (!genres.includes('Bollywood')) genres.push('Bollywood');
  }
  if (!genres.length) {
    if (old.includes('bollywood')) genres.push('Bollywood');
    else genres.push('Pop');
  }
  return genres;
}

// Replace getGenre in correctTrack
const originalGetGenre = getGenre;
// Use getGenreFixed
function correctTrackFinal(row) {
  const name = row[0];
  const artist = row[1];
  const oldGenre = row[2];
  const album = row[3];

  const known = KNOWN_SONGS[name?.trim()];
  if (known) {
    return {
      genre: known.genre.join(', '),
      language: known.language.join(', '),
      mood: known.mood.join(', '),
      type: known.type.join(', ')
    };
  }

  const genre = getGenreFixed(name, artist, album, oldGenre);
  const language = getLanguage(name, artist, album);
  const mood = getMood(name, artist, album, oldGenre);
  const type = getSongType(name, oldGenre);

  return {
    genre: [...new Set(genre)].join(', '),
    language: [...new Set(language)].join(', '),
    mood: [...new Set(mood)].join(', '),
    type: [...new Set(type)].join(', ')
  };
}

// Main
const inputPath = path.join(__dirname, '..', 'beatify-tracks-2026-03-17.xlsx');
const wb = XLSX.readFile(inputPath);
const sheetName = wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const header = data[0];
const newHeader = ['Name', 'Artist', 'Genre', 'Album', 'Release Date', 'UUID'];
const newData = [newHeader];

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row || !row[0]) continue;
  const corrected = correctTrackFinal(row);
  // All tags in one Genre column: Genre, Language, Mood, Song Type
  const genreCombined = [corrected.genre, corrected.language, corrected.mood, corrected.type].filter(Boolean).join(', ');
  newData.push([
    row[0], // Name
    row[1], // Artist
    genreCombined,
    row[3], // Album
    row[4], // Release Date
    row[5]  // UUID
  ]);
}

const newWb = XLSX.utils.book_new();
const newSheet = XLSX.utils.aoa_to_sheet(newData);
XLSX.utils.book_append_sheet(newWb, newSheet, 'Tracks');

const today = new Date().toISOString().slice(0, 10);
const outputPath = path.join(__dirname, '..', `beatify-tracks-corrected-${today}.xlsx`);
XLSX.writeFile(newWb, outputPath);

console.log(`✅ Corrected taxonomy written to: ${outputPath}`);
console.log(`   Total tracks: ${newData.length - 1}`);
