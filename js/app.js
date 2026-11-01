// ============================================================
// USER MANAGEMENT
// ============================================================
// Single-user app (Drew). The per-user DB name is kept so existing data stays put.
const currentUser='Drew';

// ============================================================
// FIREBASE CONFIG
// ============================================================
let fbDb=null;
// Never touch the real cloud backup from a local dev/test copy of the app.
const IS_LOCAL_DEV=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
function initFirebase(){
  if(IS_LOCAL_DEV){console.info('[Firebase] Disabled on localhost');return}
  try{
    if(firebaseConfig.apiKey&&!firebaseConfig.apiKey.startsWith('REPLACE')){
      firebase.initializeApp(firebaseConfig);
      fbDb=firebase.database();
    }
  }catch(e){console.warn('Firebase not configured:',e)}
}

// ============================================================
// EXERCISE LIBRARY
// ============================================================
const BODY_PARTS=['Chest','Back','Shoulders','Biceps','Triceps','Quads','Hamstrings','Glutes','Calves','Core','Forearms','Cardio'];
const EQUIPMENT=['Barbell','Dumbbell','Cable','Machine','Bodyweight','Smith Machine','Kettlebell','Band','Cardio Machine'];
let customExercises=[];

const EXERCISES=[
// CHEST
{id:'c1',name:'Flat Barbell Bench Press',body:'Chest',equip:'Barbell'},
{id:'c2',name:'Incline Barbell Bench Press',body:'Chest',equip:'Barbell'},
{id:'c3',name:'Decline Barbell Bench Press',body:'Chest',equip:'Barbell'},
{id:'c4',name:'Close-Grip Bench Press',body:'Chest',equip:'Barbell'},
{id:'c5',name:'Flat Dumbbell Press',body:'Chest',equip:'Dumbbell'},
{id:'c6',name:'Incline Dumbbell Press',body:'Chest',equip:'Dumbbell'},
{id:'c7',name:'Decline Dumbbell Press',body:'Chest',equip:'Dumbbell'},
{id:'c8',name:'Dumbbell Fly',body:'Chest',equip:'Dumbbell'},
{id:'c9',name:'Incline Dumbbell Fly',body:'Chest',equip:'Dumbbell'},
{id:'c10',name:'Cable Fly',body:'Chest',equip:'Cable'},
{id:'c11',name:'Low Cable Fly',body:'Chest',equip:'Cable'},
{id:'c12',name:'High Cable Fly',body:'Chest',equip:'Cable'},
{id:'c13',name:'Cable Crossover',body:'Chest',equip:'Cable'},
{id:'c14',name:'Machine Chest Press',body:'Chest',equip:'Machine'},
{id:'c15',name:'Pec Deck',body:'Chest',equip:'Machine'},
{id:'c16',name:'Push-Up',body:'Chest',equip:'Bodyweight'},
{id:'c17',name:'Diamond Push-Up',body:'Chest',equip:'Bodyweight'},
{id:'c18',name:'Dip (Chest)',body:'Chest',equip:'Bodyweight'},
{id:'c19',name:'Smith Machine Bench Press',body:'Chest',equip:'Smith Machine'},
{id:'c20',name:'Smith Machine Incline Press',body:'Chest',equip:'Smith Machine'},
// BACK
{id:'b1',name:'Barbell Row',body:'Back',equip:'Barbell'},
{id:'b2',name:'Pendlay Row',body:'Back',equip:'Barbell'},
{id:'b3',name:'T-Bar Row',body:'Back',equip:'Barbell'},
{id:'b4',name:'Deadlift',body:'Back',equip:'Barbell'},
{id:'b5',name:'Rack Pull',body:'Back',equip:'Barbell'},
{id:'b6',name:'Dumbbell Row',body:'Back',equip:'Dumbbell'},
{id:'b7',name:'Dumbbell Pullover',body:'Back',equip:'Dumbbell'},
{id:'b8',name:'Chest-Supported Row',body:'Back',equip:'Dumbbell'},
{id:'b9',name:'Kroc Row',body:'Back',equip:'Dumbbell'},
{id:'b10',name:'Lat Pulldown',body:'Back',equip:'Cable'},
{id:'b11',name:'Close-Grip Pulldown',body:'Back',equip:'Cable'},
{id:'b12',name:'Straight-Arm Pulldown',body:'Back',equip:'Cable'},
{id:'b13',name:'Seated Cable Row',body:'Back',equip:'Cable'},
{id:'b14',name:'Face Pull',body:'Back',equip:'Cable'},
{id:'b15',name:'Cable Pullover',body:'Back',equip:'Cable'},
{id:'b16',name:'Machine Row',body:'Back',equip:'Machine'},
{id:'b17',name:'Hammer Strength Pulldown',body:'Back',equip:'Machine'},
{id:'b18',name:'Pull-Up',body:'Back',equip:'Bodyweight'},
{id:'b19',name:'Chin-Up',body:'Back',equip:'Bodyweight'},
{id:'b20',name:'Inverted Row',body:'Back',equip:'Bodyweight'},
{id:'b21',name:'Smith Machine Row',body:'Back',equip:'Smith Machine'},
{id:'b22',name:'Kettlebell Row',body:'Back',equip:'Kettlebell'},
// SHOULDERS
{id:'s1',name:'Overhead Press',body:'Shoulders',equip:'Barbell'},
{id:'s2',name:'Push Press',body:'Shoulders',equip:'Barbell'},
{id:'s3',name:'Behind-the-Neck Press',body:'Shoulders',equip:'Barbell'},
{id:'s4',name:'Barbell Upright Row',body:'Shoulders',equip:'Barbell'},
{id:'s5',name:'Barbell Front Raise',body:'Shoulders',equip:'Barbell'},
{id:'s23',name:'Clean',body:'Shoulders',equip:'Barbell'},
{id:'s24',name:'Hang Clean',body:'Shoulders',equip:'Barbell'},
{id:'s25',name:'Power Clean',body:'Shoulders',equip:'Barbell'},
{id:'s6',name:'Dumbbell Shoulder Press',body:'Shoulders',equip:'Dumbbell'},
{id:'s7',name:'Arnold Press',body:'Shoulders',equip:'Dumbbell'},
{id:'s8',name:'Lateral Raise',body:'Shoulders',equip:'Dumbbell'},
{id:'s9',name:'Front Raise',body:'Shoulders',equip:'Dumbbell'},
{id:'s10',name:'Reverse Fly',body:'Shoulders',equip:'Dumbbell'},
{id:'s11',name:'Dumbbell Shrug',body:'Shoulders',equip:'Dumbbell'},
{id:'s12',name:'Cable Lateral Raise',body:'Shoulders',equip:'Cable'},
{id:'s13',name:'Cable Front Raise',body:'Shoulders',equip:'Cable'},
{id:'s14',name:'Cable Reverse Fly',body:'Shoulders',equip:'Cable'},
{id:'s15',name:'Cable Upright Row',body:'Shoulders',equip:'Cable'},
{id:'s16',name:'Machine Shoulder Press',body:'Shoulders',equip:'Machine'},
{id:'s17',name:'Machine Lateral Raise',body:'Shoulders',equip:'Machine'},
{id:'s18',name:'Reverse Pec Deck',body:'Shoulders',equip:'Machine'},
{id:'s19',name:'Handstand Push-Up',body:'Shoulders',equip:'Bodyweight'},
{id:'s20',name:'Pike Push-Up',body:'Shoulders',equip:'Bodyweight'},
{id:'s21',name:'Kettlebell Press',body:'Shoulders',equip:'Kettlebell'},
{id:'s22',name:'Band Pull-Apart',body:'Shoulders',equip:'Band'},
// BICEPS
{id:'bi1',name:'Barbell Curl',body:'Biceps',equip:'Barbell'},
{id:'bi2',name:'EZ-Bar Curl',body:'Biceps',equip:'Barbell'},
{id:'bi3',name:'Preacher Curl (Barbell)',body:'Biceps',equip:'Barbell'},
{id:'bi4',name:'Drag Curl',body:'Biceps',equip:'Barbell'},
{id:'bi5',name:'Dumbbell Curl',body:'Biceps',equip:'Dumbbell'},
{id:'bi6',name:'Hammer Curl',body:'Biceps',equip:'Dumbbell'},
{id:'bi7',name:'Incline Dumbbell Curl',body:'Biceps',equip:'Dumbbell'},
{id:'bi8',name:'Concentration Curl',body:'Biceps',equip:'Dumbbell'},
{id:'bi9',name:'Dumbbell Preacher Curl',body:'Biceps',equip:'Dumbbell'},
{id:'bi10',name:'Cable Curl',body:'Biceps',equip:'Cable'},
{id:'bi11',name:'Cable Hammer Curl',body:'Biceps',equip:'Cable'},
{id:'bi12',name:'Overhead Cable Curl',body:'Biceps',equip:'Cable'},
{id:'bi13',name:'Machine Preacher Curl',body:'Biceps',equip:'Machine'},
{id:'bi14',name:'Kettlebell Curl',body:'Biceps',equip:'Kettlebell'},
{id:'bi15',name:'Band Curl',body:'Biceps',equip:'Band'},
// TRICEPS
{id:'tr1',name:'Close-Grip Bench Press',body:'Triceps',equip:'Barbell'},
{id:'tr2',name:'Skull Crusher',body:'Triceps',equip:'Barbell'},
{id:'tr3',name:'JM Press',body:'Triceps',equip:'Barbell'},
{id:'tr4',name:'Tricep Dumbbell Extension',body:'Triceps',equip:'Dumbbell'},
{id:'tr5',name:'Dumbbell Kickback',body:'Triceps',equip:'Dumbbell'},
{id:'tr6',name:'Overhead Dumbbell Extension',body:'Triceps',equip:'Dumbbell'},
{id:'tr7',name:'Tricep Pushdown',body:'Triceps',equip:'Cable'},
{id:'tr8',name:'Overhead Cable Extension',body:'Triceps',equip:'Cable'},
{id:'tr9',name:'Rope Pushdown',body:'Triceps',equip:'Cable'},
{id:'tr10',name:'Reverse Grip Pushdown',body:'Triceps',equip:'Cable'},
{id:'tr11',name:'Tricep Dip Machine',body:'Triceps',equip:'Machine'},
{id:'tr12',name:'Dip (Tricep)',body:'Triceps',equip:'Bodyweight'},
{id:'tr13',name:'Diamond Push-Up',body:'Triceps',equip:'Bodyweight'},
{id:'tr14',name:'Band Pushdown',body:'Triceps',equip:'Band'},
// QUADS
{id:'q1',name:'Barbell Back Squat',body:'Quads',equip:'Barbell'},
{id:'q2',name:'Front Squat',body:'Quads',equip:'Barbell'},
{id:'q3',name:'Barbell Lunge',body:'Quads',equip:'Barbell'},
{id:'q4',name:'Zercher Squat',body:'Quads',equip:'Barbell'},
{id:'q5',name:'Goblet Squat',body:'Quads',equip:'Dumbbell'},
{id:'q6',name:'Dumbbell Lunge',body:'Quads',equip:'Dumbbell'},
{id:'q7',name:'Dumbbell Step-Up',body:'Quads',equip:'Dumbbell'},
{id:'q8',name:'Dumbbell Bulgarian Split Squat',body:'Quads',equip:'Dumbbell'},
{id:'q9',name:'Leg Press',body:'Quads',equip:'Machine'},
{id:'q10',name:'Leg Extension',body:'Quads',equip:'Machine'},
{id:'q11',name:'Hack Squat',body:'Quads',equip:'Machine'},
{id:'q12',name:'Sissy Squat',body:'Quads',equip:'Bodyweight'},
{id:'q13',name:'Bodyweight Squat',body:'Quads',equip:'Bodyweight'},
{id:'q14',name:'Pistol Squat',body:'Quads',equip:'Bodyweight'},
{id:'q15',name:'Smith Machine Squat',body:'Quads',equip:'Smith Machine'},
{id:'q16',name:'Kettlebell Squat',body:'Quads',equip:'Kettlebell'},
// HAMSTRINGS
{id:'h1',name:'Romanian Deadlift',body:'Hamstrings',equip:'Barbell'},
{id:'h2',name:'Stiff-Leg Deadlift',body:'Hamstrings',equip:'Barbell'},
{id:'h3',name:'Good Morning',body:'Hamstrings',equip:'Barbell'},
{id:'h4',name:'Dumbbell Romanian Deadlift',body:'Hamstrings',equip:'Dumbbell'},
{id:'h5',name:'Single-Leg Dumbbell RDL',body:'Hamstrings',equip:'Dumbbell'},
{id:'h6',name:'Cable Pull-Through',body:'Hamstrings',equip:'Cable'},
{id:'h7',name:'Lying Leg Curl',body:'Hamstrings',equip:'Machine'},
{id:'h8',name:'Seated Leg Curl',body:'Hamstrings',equip:'Machine'},
{id:'h9',name:'Nordic Hamstring Curl',body:'Hamstrings',equip:'Bodyweight'},
{id:'h10',name:'Glute-Ham Raise',body:'Hamstrings',equip:'Bodyweight'},
{id:'h11',name:'Kettlebell Swing',body:'Hamstrings',equip:'Kettlebell'},
// GLUTES
{id:'g1',name:'Barbell Hip Thrust',body:'Glutes',equip:'Barbell'},
{id:'g2',name:'Sumo Deadlift',body:'Glutes',equip:'Barbell'},
{id:'g3',name:'Dumbbell Hip Thrust',body:'Glutes',equip:'Dumbbell'},
{id:'g4',name:'Dumbbell Sumo Squat',body:'Glutes',equip:'Dumbbell'},
{id:'g5',name:'Cable Kickback',body:'Glutes',equip:'Cable'},
{id:'g6',name:'Cable Pull-Through',body:'Glutes',equip:'Cable'},
{id:'g7',name:'Hip Abduction Machine',body:'Glutes',equip:'Machine'},
{id:'g8',name:'Glute Bridge',body:'Glutes',equip:'Bodyweight'},
{id:'g9',name:'Single-Leg Glute Bridge',body:'Glutes',equip:'Bodyweight'},
{id:'g10',name:'Donkey Kick',body:'Glutes',equip:'Bodyweight'},
{id:'g11',name:'Banded Clamshell',body:'Glutes',equip:'Band'},
{id:'g12',name:'Banded Lateral Walk',body:'Glutes',equip:'Band'},
// CALVES
{id:'ca1',name:'Barbell Calf Raise',body:'Calves',equip:'Barbell'},
{id:'ca2',name:'Dumbbell Calf Raise',body:'Calves',equip:'Dumbbell'},
{id:'ca3',name:'Seated Calf Raise',body:'Calves',equip:'Machine'},
{id:'ca4',name:'Standing Calf Raise Machine',body:'Calves',equip:'Machine'},
{id:'ca5',name:'Leg Press Calf Raise',body:'Calves',equip:'Machine'},
{id:'ca6',name:'Bodyweight Calf Raise',body:'Calves',equip:'Bodyweight'},
{id:'ca7',name:'Smith Machine Calf Raise',body:'Calves',equip:'Smith Machine'},
// CORE
{id:'co1',name:'Barbell Rollout',body:'Core',equip:'Barbell'},
{id:'co2',name:'Landmine Rotation',body:'Core',equip:'Barbell'},
{id:'co3',name:'Dumbbell Side Bend',body:'Core',equip:'Dumbbell'},
{id:'co4',name:'Dumbbell Woodchop',body:'Core',equip:'Dumbbell'},
{id:'co5',name:'Cable Crunch',body:'Core',equip:'Cable'},
{id:'co6',name:'Cable Woodchop',body:'Core',equip:'Cable'},
{id:'co7',name:'Pallof Press',body:'Core',equip:'Cable'},
{id:'co8',name:'Machine Crunch',body:'Core',equip:'Machine'},
{id:'co9',name:'Plank',body:'Core',equip:'Bodyweight'},
{id:'co10',name:'Side Plank',body:'Core',equip:'Bodyweight'},
{id:'co11',name:'Crunch',body:'Core',equip:'Bodyweight'},
{id:'co12',name:'Hanging Leg Raise',body:'Core',equip:'Bodyweight'},
{id:'co13',name:'Hanging Knee Raise',body:'Core',equip:'Bodyweight'},
{id:'co14',name:'Russian Twist',body:'Core',equip:'Bodyweight'},
{id:'co15',name:'Bicycle Crunch',body:'Core',equip:'Bodyweight'},
{id:'co16',name:'V-Up',body:'Core',equip:'Bodyweight'},
{id:'co17',name:'Ab Wheel Rollout',body:'Core',equip:'Bodyweight'},
{id:'co18',name:'Dead Bug',body:'Core',equip:'Bodyweight'},
{id:'co19',name:'Mountain Climber',body:'Core',equip:'Bodyweight'},
{id:'co20',name:'Kettlebell Turkish Get-Up',body:'Core',equip:'Kettlebell'},
// FOREARMS
{id:'f1',name:'Barbell Wrist Curl',body:'Forearms',equip:'Barbell'},
{id:'f2',name:'Reverse Barbell Curl',body:'Forearms',equip:'Barbell'},
{id:'f3',name:'Barbell Reverse Wrist Curl',body:'Forearms',equip:'Barbell'},
{id:'f4',name:'Dumbbell Wrist Curl',body:'Forearms',equip:'Dumbbell'},
{id:'f5',name:'Reverse Dumbbell Curl',body:'Forearms',equip:'Dumbbell'},
{id:'f6',name:'Farmer Walk',body:'Forearms',equip:'Dumbbell'},
{id:'f7',name:'Cable Wrist Curl',body:'Forearms',equip:'Cable'},
{id:'f8',name:'Dead Hang',body:'Forearms',equip:'Bodyweight'},
{id:'f9',name:'Kettlebell Farmer Walk',body:'Forearms',equip:'Kettlebell'},
// CARDIO
{id:'cd1',name:'Treadmill Run',body:'Cardio',equip:'Cardio Machine',isCardio:true},
{id:'cd2',name:'Treadmill Walk (Incline)',body:'Cardio',equip:'Cardio Machine',isCardio:true},
{id:'cd3',name:'Treadmill Sprint Intervals',body:'Cardio',equip:'Cardio Machine',isCardio:true},
{id:'cd4',name:'Assault Bike',body:'Cardio',equip:'Cardio Machine',isCardio:true},
{id:'cd5',name:'Assault Bike Intervals',body:'Cardio',equip:'Cardio Machine',isCardio:true},
{id:'cd6',name:'Rowing Machine',body:'Cardio',equip:'Cardio Machine',isCardio:true},
{id:'cd7',name:'Rowing Intervals',body:'Cardio',equip:'Cardio Machine',isCardio:true},
{id:'cd8',name:'Stair Climber',body:'Cardio',equip:'Cardio Machine',isCardio:true},
{id:'cd9',name:'Stair Climber (Zone 2)',body:'Cardio',equip:'Cardio Machine',isCardio:true},
{id:'cd10',name:'Stationary Bike',body:'Cardio',equip:'Cardio Machine',isCardio:true},
{id:'cd11',name:'Stationary Bike Intervals',body:'Cardio',equip:'Cardio Machine',isCardio:true},
{id:'cd12',name:'Elliptical',body:'Cardio',equip:'Cardio Machine',isCardio:true},
{id:'cd13',name:'Outdoor Run',body:'Cardio',equip:'Bodyweight',isCardio:true},
{id:'cd14',name:'Outdoor Sprint Intervals',body:'Cardio',equip:'Bodyweight',isCardio:true},
{id:'cd15',name:'Jump Rope',body:'Cardio',equip:'Bodyweight',isCardio:true},
{id:'cd16',name:'Battle Ropes',body:'Cardio',equip:'Bodyweight',isCardio:true},
{id:'cd17',name:'Box Jumps',body:'Cardio',equip:'Bodyweight',isCardio:true},
{id:'cd18',name:'Burpees',body:'Cardio',equip:'Bodyweight',isCardio:true},
{id:'cd19',name:'Ski Erg',body:'Cardio',equip:'Cardio Machine',isCardio:true},
{id:'cd20',name:'4x4 Cardio on Rower',body:'Cardio',equip:'Cardio Machine',isCardio:true},
{id:'cd21',name:'Zone 2 Cardio on Stairs',body:'Cardio',equip:'Cardio Machine',isCardio:true},
{id:'cd22',name:'Norwegian 4x4',body:'Cardio',equip:'Cardio Machine',isCardio:true,isInterval:true},
{id:'q40',name:'Box Jump',body:'Quads',equip:'Bodyweight'},
{id:'b40',name:'Back Extension',body:'Back',equip:'Bodyweight'},
];

function getAllExercises(){return [...EXERCISES,...PROGRAM_EXERCISES,...customExercises]}

// ============================================================
// APP STATE
// ============================================================
let state={
  tab:'today',
  // program settings (see js/program.js DEFAULT_PROGRAM)
  program:JSON.parse(JSON.stringify(DEFAULT_PROGRAM)),homeWeekIdx:null,
  lastExport:null,pendingBackup:null,backups:[],storagePersisted:false,
  subPage:null,
  // workout session
  session:null, // {id,name,startTime,exercises:[{exerciseId,name,body,equip,sets:[{weight,reps,done}]}],currentExIdx:0}
  // timer
  timerRunning:false,timerStartedAt:null,timerPausedAccumulated:0,timerTargetSeconds:0,timerInterval:null,
  // interval timer
  intervalTimer:null,intervalTimerInterval:null,
  // filters
  libBodyFilter:'All',libEquipFilter:'All',libSearch:'',
  // templates
  templates:[],templatesArchive:[],
  // history
  workouts:[],
  // bodyweight
  bodyweights:[],
  // stats
  // calendar
  // settings
  defaultRestTime:90,
  // edit template
  // custom exercise modal
  showCustomExercise:false,
  // select exercise modal
  showExercisePicker:false,
  pickerCallback:null,
  // body weight prompt
  showBWPrompt:false,
  // goals
  goals:[],
  showSetGoal:false,
  _goalTimeframe:null,
  _goalType:null,
};

// ============================================================
// ICONS (inline SVG)
// ============================================================
const icons={
  dumbbell:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5h11M6.5 17.5h11M2 12h4M18 12h4M3 8v8M21 8v8M6 7v10M18 7v10"/></svg>`,
  book:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  clipboard:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
  chart:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  clock:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  search:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  plus:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  check:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  trash:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  play:`<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  pause:`<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
  back:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  edit:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  copy:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  gear:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  target:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  scale:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>`,
};

// ============================================================
// HELPERS
// ============================================================
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);

// Debounced search to prevent full re-render on every keystroke
let _searchTimeout;
function debouncedSearch(key, value, delay=150) {
    clearTimeout(_searchTimeout);
    _searchTimeout = setTimeout(() => {
        if(state.showExercisePicker) {
            // Targeted DOM update: only replace the exercise list inside the picker modal
            state[key] = value;
            updatePickerResults();
        } else {
            setState({[key]: value});
        }
    }, delay);
}

// Targeted update for exercise picker results (avoids full re-render)
function updatePickerResults() {
    const container = document.getElementById('picker-results');
    if(!container) return;
    let filtered = getAllExercises();
    if(state.libBodyFilter !== 'All') filtered = filtered.filter(e => e.body === state.libBodyFilter);
    if(state.libEquipFilter !== 'All') filtered = filtered.filter(e => e.equip === state.libEquipFilter);
    if(state.libSearch) filtered = filtered.filter(e => e.name.toLowerCase().includes(state.libSearch.toLowerCase()));
    container.innerHTML = filtered.map(ex => `
        <div class="exercise-item" onclick="pickExercise('${ex.id}')">
            <div class="exercise-info"><div class="exercise-name">${ex.name}</div><div class="exercise-meta">${ex.body} · ${ex.equip}</div></div>
            <span class="exercise-add">+</span>
        </div>`).join('');
}

const fmtDate=d=>{const dt=new Date(d);return dt.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})};
const fmtTime=s=>{const m=Math.floor(s/60);const sec=s%60;return `${m}:${sec.toString().padStart(2,'0')}`};
const fmtDuration=s=>{const h=Math.floor(s/3600);const m=Math.floor((s%3600)/60);return h>0?`${h}h ${m}m`:`${m}m`};
const dayKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const getMonday=d=>{const dt=new Date(d);const day=dt.getDay();const diff=dt.getDate()-day+(day===0?-6:1);dt.setDate(diff);dt.setHours(0,0,0,0);return dt};
const weekStart=getMonday(new Date());

function getLastPerformance(exerciseId){
  const sorted=[...state.workouts].sort((a,b)=>new Date(b.startTime)-new Date(a.startTime));
  for(const w of sorted){
    const ex=w.exercises.find(e=>e.exerciseId===exerciseId);
    if(ex&&ex.sets.some(s=>s.done))return ex;
  }
  return null;
}

function getExercisePR(exerciseId){
  let maxWeight=0;
  for(const w of state.workouts){
    const ex=w.exercises.find(e=>e.exerciseId===exerciseId);
    if(ex)for(const s of ex.sets)if(s.done&&s.weight>maxWeight)maxWeight=s.weight;
  }
  return maxWeight;
}

function calcVolume(workout){
  let total=0;
  for(const ex of workout.exercises){
    if(ex.isCardio||ex.unit==='s'||ex.unit==='min')continue;
    const k=ex.unit==='kg'?KG_TO_LB:1;
    for(const s of ex.sets)if(s.done)total+=(s.weight||0)*k*(s.reps||0);
  }
  return Math.round(total);
}

function getTimerRemaining(){
  if(!state.timerTargetSeconds)return 0;
  const elapsed=state.timerPausedAccumulated+(state.timerRunning&&state.timerStartedAt?Date.now()-state.timerStartedAt:0);
  return Math.max(0,Math.ceil((state.timerTargetSeconds*1000-elapsed)/1000));
}

function isStepExercise(name){return /stair|climber|step/i.test(name)}
function isDistExercise(name){return /run|row|bike|cycle|elliptical|ski.?erg/i.test(name)}
function isSpeedExercise(name){return /treadmill/i.test(name)}

function getStreak(){
  if(state.workouts.length===0)return 0;
  let streak=0;let d=new Date();
  while(true){
    const mon=getMonday(d);const end=new Date(mon);end.setDate(end.getDate()+7);
    if(state.workouts.some(w=>{const wd=new Date(w.startTime);return wd>=mon&&wd<end})){
      streak++;d.setDate(d.getDate()-7);
    }else break;
  }
  return streak;
}

function getWeekWorkouts(){
  return state.workouts.filter(w=>new Date(w.startTime)>=weekStart);
}

function getSetsPerBodyPart(workouts){
  const counts={};
  BODY_PARTS.forEach(bp=>counts[bp]=0);
  for(const w of workouts)for(const ex of w.exercises){
    const doneSets=ex.sets.filter(s=>s.done).length;
    if(counts[ex.body]!==undefined)counts[ex.body]+=doneSets;
  }
  return counts;
}

// ============================================================
// RENDER ENGINE
// ============================================================
function render(){
  const app=document.getElementById('app');
  // Preserve scroll position (#5 fix)
  const contentEl=document.getElementById('main-content');
  const scrollTop=contentEl?contentEl.scrollTop:0;
  // Preserve focused input
  const focused=document.activeElement;
  const focusId=focused?focused.getAttribute('data-sid'):null;
  const focusVal=focused?focused.value:null;
  const focusSel=focused?focused.selectionStart:null;

  let floatingTimer='';
  const _timerRemaining=getTimerRemaining();
  if(state.subPage==='active-workout'&&(state.timerRunning||_timerRemaining>0)){
    floatingTimer=`<div class="floating-timer">
      <div class="ft-time">${fmtTime(_timerRemaining)}</div>
      <div class="ft-controls">
        <button class="btn btn-sm" style="padding:8px 14px" onclick="toggleTimer()">${state.timerRunning?'Pause':'Resume'}</button>
        <button class="btn btn-sm btn-outline" style="padding:8px 14px" onclick="resetTimer()">Stop</button>
      </div>
    </div>`;
  }

  const dock=state.subPage==='run'&&state.session?renderRunDock():'';
  app.innerHTML=renderHeader()+`<div class="content ${state.subPage==='run'?'is-run':''}" id="main-content" style="${floatingTimer?'padding-bottom:96px':''}">`+renderPage()+`</div>`+(dock||renderTabBar())+floatingTimer+renderModals();

  // Restore scroll position
  const newContent=document.getElementById('main-content');
  if(newContent)newContent.scrollTop=scrollTop;
  // Restore focus — set value BEFORE focus to prevent keyboard flicker on mobile
  if(focusId){
    requestAnimationFrame(() => {
      const el=document.querySelector(`[data-sid="${focusId}"]`);
      if(el){
        el.value=focusVal||'';
        el.focus();
        if(focusSel!==null)try{el.setSelectionRange(focusSel,focusSel)}catch(e){}
      }
    });
  }
  attachEvents();
}

function renderHeader(){
  const back=(fn,title,right='')=>`<div class="header"><button class="header-back" aria-label="Back" onclick="${fn}">${icons.back}</button><h1>${title}</h1>${right||'<div class="hdr-spacer"></div>'}</div>`;
  switch(state.subPage){
    case 'run':return renderRunHeader();
    case 'active-workout':return `<div class="header"><button class="header-back" aria-label="Discard" onclick="confirmEndWorkout()">${icons.back}</button><h1>${esc(state.session?.name||'Workout')}</h1><button class="header-btn" onclick="finishWorkout()">Finish</button></div>`;
    case 'workout-setup':return back('cancelWorkoutSetup()','Quick workout');
    case 'workout-detail':return back('goBackFromDetail()','Session',`<button class="header-btn" onclick="editPastWorkout('${state._viewWorkoutId}')">Edit</button>`);
    case 'edit-past-workout':return back("setState({subPage:'workout-detail'})",'Edit session',`<button class="header-btn" onclick="savePastWorkout()">Save</button>`);
    case 'interval-timer':{const it=state.intervalTimer;if(it&&(it.phase==='running'||it.phase==='paused'))return '';return back('cancelIntervalTimer()','Interval timer')}
    case 'preview':return back('setState({subPage:null})','Session');
    case 'program':return back("setState({subPage:null})",'Program');
    case 'next-cycle':return back("setState({subPage:state.tab==='more'?null:null,_cycleDraft:null})",'Next cycle');
    case 'lift':return back("setState({subPage:null})",'Lift');
    case 'goals':return back("setState({subPage:null})",'Goals');
    case 'library':return back("setState({subPage:null})",'Exercise library');
  }
  const titles={today:'Ski Season Build',history:'History',progress:'Progress',more:'More'};
  return `<div class="header"><h1>${titles[state.tab]}</h1></div>`;
}

function goBackFromDetail(){
  state.subPage=state._detailFrom||null;state._viewWorkoutId=null;
  render();
}

function renderTabBar(){
  if(state.subPage)return '';
  const tabs=[
    {id:'today',icon:icons.dumbbell,label:'Today'},
    {id:'history',icon:icons.clock,label:'History'},
    {id:'progress',icon:icons.chart,label:'Progress'},
    {id:'more',icon:icons.gear,label:'More'},
  ];
  return `<nav class="tab-bar">${tabs.map(t=>`<button class="tab ${state.tab===t.id?'active':''}" aria-current="${state.tab===t.id?'page':'false'}" onclick="switchTab('${t.id}')">${t.icon}<span>${t.label}</span></button>`).join('')}</nav>`;
}

function renderPage(){
  switch(state.subPage){
    case 'run':return state.session?renderRunner():'';
    case 'active-workout':return renderActiveWorkout();
    case 'workout-setup':return renderWorkoutSetup();
    case 'workout-detail':return renderWorkoutDetail();
    case 'edit-past-workout':return renderEditPastWorkout();
    case 'interval-timer':return renderIntervalTimer();
    case 'preview':return renderPreview();
    case 'program':return renderProgramSettings();
    case 'next-cycle':return renderNextCycle();
    case 'lift':return renderLiftDetail();
    case 'goals':return renderGoalsTab();
    case 'library':return renderLibraryTab();
  }
  switch(state.tab){
    case 'today':return renderHome();
    case 'history':return renderHistory();
    case 'progress':return renderProgress();
    case 'more':return renderMore();
  }
}

// ============================================================
// LIBRARY TAB
// ============================================================
function renderLibraryTab(){
  let filtered=getAllExercises();
  if(state.libBodyFilter!=='All')filtered=filtered.filter(e=>e.body===state.libBodyFilter);
  if(state.libEquipFilter!=='All')filtered=filtered.filter(e=>e.equip===state.libEquipFilter);
  if(state.libSearch)filtered=filtered.filter(e=>e.name.toLowerCase().includes(state.libSearch.toLowerCase()));

  return `
    <div class="search-bar">${icons.search}<input type="text" data-sid="lib-search" placeholder="Search exercises..." value="${state.libSearch}" oninput="debouncedSearch('libSearch',this.value)"></div>
    <div class="filter-row">${['All',...BODY_PARTS].map(bp=>`<button class="filter-chip ${state.libBodyFilter===bp?'active':''}" onclick="setState({libBodyFilter:'${bp}'})">${bp}</button>`).join('')}</div>
    <div class="filter-row">${['All',...EQUIPMENT].map(eq=>`<button class="filter-chip ${state.libEquipFilter===eq?'active':''}" onclick="setState({libEquipFilter:'${eq}'})">${eq}</button>`).join('')}</div>
    <div class="text-sm text-center mb-8" style="color:var(--text3)">${filtered.length} exercises</div>
    ${filtered.map(ex=>{
      const pr=getExercisePR(ex.id);
      return `<div class="exercise-item">
        <div class="exercise-info"><div class="exercise-name">${ex.name}${pr>0?`<span class="pr-badge">PR: ${pr} lbs</span>`:''}</div><div class="exercise-meta">${ex.body} · ${ex.equip}</div></div>
      </div>`;
    }).join('')}
    ${filtered.length===0?'<div class="empty-state"><p>No exercises match your filters</p></div>':''}
    <button class="btn btn-outline mt-16" onclick="setState({showCustomExercise:true})"><span style="font-size:18px">+</span> Create Custom Exercise</button>
  `;
}

// ============================================================
// GOALS TAB
// ============================================================
function getGoalProgress(goal){
  const now=new Date();
  const start=new Date(goal.startDate);
  const end=new Date(goal.endDate);
  const expired=now>end;

  if(goal.type==='gym_days'){
    const count=state.workouts.filter(w=>{
      const d=new Date(w.startTime);
      return d>=start&&d<=end&&(!w.program||(SESSION_META[w.program.sessionId]||{}).gym);
    }).length;
    const pct=Math.min(100,Math.round((count/goal.target)*100));
    return {current:count,target:goal.target,pct,label:`${count} of ${goal.target} completed`,expired,complete:count>=goal.target};
  }

  if(goal.type==='pr'){
    let bestInPeriod=0;
    for(const w of state.workouts){
      const d=new Date(w.startTime);
      if(d>=start&&d<=end){
        for(const ex of w.exercises){
          if(ex.name===goal.exercise){
            for(const s of ex.sets){
              if(s.done&&s.weight>0&&s.weight>bestInPeriod)bestInPeriod=s.weight;
            }
          }
        }
      }
    }
    // Also check all-time PR before goal start for baseline
    let baseline=0;
    for(const w of state.workouts){
      const d=new Date(w.startTime);
      if(d<start){
        for(const ex of w.exercises){
          if(ex.name===goal.exercise){
            for(const s of ex.sets){
              if(s.done&&s.weight>0&&s.weight>baseline)baseline=s.weight;
            }
          }
        }
      }
    }
    const currentPR=Math.max(bestInPeriod,baseline);
    const needed=goal.target-baseline;
    const gained=currentPR-baseline;
    const pct=needed>0?Math.min(100,Math.round((gained/needed)*100)):currentPR>=goal.target?100:0;
    return {current:currentPR,target:goal.target,pct,label:`Current PR: ${currentPR} lbs · ${Math.max(0,goal.target-currentPR)} lbs to go`,expired,complete:currentPR>=goal.target};
  }

  if(goal.type==='weight'){
    const bwInPeriod=state.bodyweights.filter(b=>{
      const d=new Date(b.date);
      return d>=start&&d<=end;
    }).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const latestBW=bwInPeriod.length>0?bwInPeriod[0].weight:null;
    const startBW=state.bodyweights.filter(b=>new Date(b.date)<=start).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const baseWeight=startBW.length>0?startBW[0].weight:(latestBW||0);

    if(!latestBW)return {current:0,target:goal.target,pct:0,label:'No weigh-ins yet',expired,complete:false};

    const goingDown=goal.target<baseWeight;
    const totalChange=Math.abs(goal.target-baseWeight);
    const currentChange=goingDown?(baseWeight-latestBW):(latestBW-baseWeight);
    const pct=totalChange>0?Math.min(100,Math.round((Math.max(0,currentChange)/totalChange)*100)):0;
    const complete=goingDown?latestBW<=goal.target:latestBW>=goal.target;
    return {current:latestBW,target:goal.target,pct,label:`Current: ${latestBW} lbs · Target: ${goal.target} lbs`,expired,complete};
  }

  return {current:0,target:0,pct:0,label:'',expired:false,complete:false};
}

function daysLeft(endDate){
  const diff=Math.ceil((new Date(endDate)-new Date())/(1000*60*60*24));
  return Math.max(0,diff);
}

function goalEndDate(timeframe){
  const now=new Date();
  if(timeframe==='week'){const d=new Date(now);d.setDate(d.getDate()+7);return d.toISOString();}
  if(timeframe==='month'){const d=new Date(now);d.setMonth(d.getMonth()+1);return d.toISOString();}
  if(timeframe==='quarter'){const d=new Date(now);d.setMonth(d.getMonth()+3);return d.toISOString();}
  return now.toISOString();
}

function renderGoalsTab(){
  const timeframes=[
    {key:'week',label:'1 WEEK',cls:'week',color:'var(--green-bright)'},
    {key:'month',label:'1 MONTH',cls:'month',color:'#3498db'},
    {key:'quarter',label:'3 MONTHS',cls:'quarter',color:'#9b59b6'}
  ];

  let html='<div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:12px">MY GOALS</div>';

  for(const tf of timeframes){
    const goal=state.goals.find(g=>g.timeframe===tf.key);
    if(goal){
      const prog=getGoalProgress(goal);
      if(prog.complete&&!goal.completed){
        goal.completed=true;
        dbPut('goals',goal);
      }
      const isComplete=goal.completed||prog.complete;
      const isExpired=prog.expired&&!isComplete;

      if(isComplete){
        html+=`<div class="goal-card" style="border-color:var(--green);background:linear-gradient(135deg,var(--bg2),var(--green-dim))">
          <div class="badge-complete">COMPLETE</div>
          <div class="goal-timeframe ${tf.cls}">${tf.label}</div>
          <div class="goal-title">${goal.title}</div>
          <div class="goal-detail">Done! ${icons.check||'✓'}</div>
          <div class="goal-progress-bar"><div class="goal-progress-fill ${tf.cls}" style="width:100%"></div></div>
          <div class="goal-progress-text"><span>${prog.current} of ${prog.target}</span><span style="color:var(--green-bright);cursor:pointer" onclick="deleteGoalAndNew('${goal.id}','${tf.key}')">Set new goal →</span></div>
        </div>`;
      } else if(isExpired){
        html+=`<div class="goal-card" style="border-color:var(--red)">
          <div style="position:absolute;top:12px;right:12px;background:var(--red);color:#fff;font-size:10px;font-weight:800;padding:3px 8px;border-radius:4px">EXPIRED</div>
          <div class="goal-timeframe ${tf.cls}">${tf.label}</div>
          <div class="goal-title">${goal.title}</div>
          <div class="goal-detail">${prog.label}</div>
          <div class="goal-progress-bar"><div class="goal-progress-fill ${tf.cls}" style="width:${prog.pct}%"></div></div>
          <div class="goal-progress-text"><span>${prog.pct}%</span><span style="color:var(--red);cursor:pointer" onclick="deleteGoalAndNew('${goal.id}','${tf.key}')">Replace →</span></div>
        </div>`;
      } else {
        const dl=daysLeft(goal.endDate);
        const endFmt=new Date(goal.endDate).toLocaleDateString('en-US',{month:'short',day:'numeric'});
        html+=`<div class="goal-card${dl<=2?' highlight':''}">
          <div class="goal-timeframe ${tf.cls}">${tf.label}</div>
          <div class="goal-title">${goal.title}</div>
          <div class="goal-detail">${prog.label} · ${dl} day${dl!==1?'s':''} left</div>
          <div class="goal-progress-bar"><div class="goal-progress-fill ${tf.cls}" style="width:${prog.pct}%"></div></div>
          <div class="goal-progress-text"><span>${prog.pct}%</span><span>Ends ${endFmt}</span></div>
          <div style="margin-top:10px;text-align:right"><button class="btn btn-sm btn-outline" style="width:auto;font-size:11px;padding:6px 10px;color:var(--red);border-color:var(--red)" onclick="deleteGoal('${goal.id}')">Remove</button></div>
        </div>`;
      }
    } else {
      html+=`<div class="goal-empty" onclick="openSetGoal('${tf.key}')">
        <div class="plus">+</div>
        <p>Set a ${tf.key==='week'?'1-week':tf.key==='month'?'1-month':'3-month'} goal</p>
      </div>`;
    }
  }

  // Completed goals history
  const completed=state.goals.filter(g=>g.completed||getGoalProgress(g).complete);
  // Don't show active completed ones again - they're shown above
  // Show archived ones (goals that have been replaced)
  const archived=state.goals.filter(g=>g.archived);
  if(archived.length>0){
    html+=`<div style="margin-top:24px;font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:12px">PAST GOALS</div>`;
    for(const g of archived.sort((a,b)=>new Date(b.endDate)-new Date(a.endDate)).slice(0,10)){
      const tfInfo=timeframes.find(t=>t.key===g.timeframe);
      const wasComplete=g.completed;
      html+=`<div class="goal-card" style="opacity:.6">
        <div class="goal-timeframe ${tfInfo?.cls||''}">${tfInfo?.label||g.timeframe.toUpperCase()}</div>
        <div class="goal-title">${g.title}</div>
        <div class="goal-detail">${wasComplete?'Completed ✓':'Expired'}</div>
      </div>`;
    }
  }

  // Set goal modal
  if(state.showSetGoal){
    const tf=state._goalTimeframe;
    const tfLabel=tf==='week'?'1 Week':tf==='month'?'1 Month':'3 Months';
    const allEx=getAllExercises();

    html+=`<div class="modal-overlay" onclick="if(event.target===this)setState({showSetGoal:false})">
      <div class="modal">
        <div class="modal-title">Set a Goal</div>
        <div class="goal-form-group">
          <label>Timeframe</label>
          <input type="text" value="${tfLabel}" disabled style="opacity:.6">
        </div>
        <div class="goal-form-group">
          <label>Goal Type</label>
          <select data-sid="goal-type" onchange="setState({_goalType:this.value})">
            <option value="gym_days" ${state._goalType==='gym_days'?'selected':''}>X Total Gym Days</option>
            <option value="pr" ${state._goalType==='pr'?'selected':''}>PR of X on Exercise</option>
            <option value="weight" ${state._goalType==='weight'?'selected':''}>Body Weight of X lbs</option>
          </select>
        </div>
        ${state._goalType==='pr'?`
          <div class="goal-form-group">
            <label>Exercise</label>
            <select data-sid="goal-exercise">
              ${allEx.filter(e=>e.body!=='Cardio').map(e=>`<option value="${e.name}">${e.name}</option>`).join('')}
            </select>
          </div>
          <div class="goal-form-group">
            <label>Target Weight (lbs)</label>
            <input type="number" data-sid="goal-target" placeholder="e.g. 225" inputmode="numeric">
          </div>
        `:''}
        ${state._goalType==='gym_days'?`
          <div class="goal-form-group">
            <label>Number of Gym Days</label>
            <input type="number" data-sid="goal-target" placeholder="e.g. ${tf==='week'?'3':tf==='month'?'12':'40'}" inputmode="numeric">
          </div>
        `:''}
        ${state._goalType==='weight'?`
          <div class="goal-form-group">
            <label>Target Body Weight (lbs)</label>
            <input type="number" data-sid="goal-target" placeholder="e.g. 180" inputmode="decimal">
          </div>
        `:''}
        <button class="btn" onclick="saveGoal()">Set Goal</button>
      </div>
    </div>`;
  }

  return html;
}

function openSetGoal(timeframe){
  setState({showSetGoal:true,_goalTimeframe:timeframe,_goalType:'gym_days'});
}

async function saveGoal(){
  const tf=state._goalTimeframe;
  const type=state._goalType;
  const targetEl=document.querySelector('[data-sid="goal-target"]');
  const target=targetEl?parseFloat(targetEl.value):0;

  if(!target||target<=0){alert('Please enter a target value');return;}

  let title='';
  let exercise=null;

  if(type==='gym_days'){
    title=`${target} Gym Days`;
  } else if(type==='pr'){
    const exEl=document.querySelector('[data-sid="goal-exercise"]');
    exercise=exEl?exEl.value:'';
    if(!exercise){alert('Please select an exercise');return;}
    title=`PR ${target} lbs on ${exercise}`;
  } else if(type==='weight'){
    title=`Reach ${target} lbs`;
  }

  const goal={
    id:'goal_'+Date.now(),
    timeframe:tf,
    type:type,
    title:title,
    target:target,
    exercise:exercise,
    startDate:new Date().toISOString(),
    endDate:goalEndDate(tf),
    completed:false,
    archived:false
  };

  // Archive any existing goal in this timeframe
  const existing=state.goals.find(g=>g.timeframe===tf&&!g.archived);
  if(existing){
    existing.archived=true;
    await dbPut('goals',existing);
  }

  state.goals.push(goal);
  await dbPut('goals',goal);
  backupToFirebase();
  setState({showSetGoal:false,_goalTimeframe:null,_goalType:null});
}

async function deleteGoal(id){
  const idx=state.goals.findIndex(g=>g.id===id);
  if(idx>-1){
    await dbDelete('goals',id);
    state.goals.splice(idx,1);
    backupToFirebase();
    render();
  }
}

async function deleteGoalAndNew(id,timeframe){
  const goal=state.goals.find(g=>g.id===id);
  if(goal){
    goal.archived=true;
    await dbPut('goals',goal);
  }
  setState({showSetGoal:true,_goalTimeframe:timeframe,_goalType:'gym_days'});
}

// ============================================================
// ACTIVE WORKOUT
// ============================================================
function renderActiveWorkout(){
  if(!state.session)return '';
  const s=state.session;
  const dur=Math.floor((Date.now()-new Date(s.startTime).getTime())/1000);
  const latestBW=state.bodyweights.length>0?[...state.bodyweights].sort((a,b)=>new Date(b.date)-new Date(a.date))[0].weight:180;
  const sessionCals=getSessionCalories(s,latestBW);

  return `
    <div class="workout-topbar">
      <div class="topbar-row">
        <div class="timer-pills">
          <button class="timer-pill ${state._selectedRest===60?'active':''}" onclick="startRestTimerWith(60)">60s</button>
          <button class="timer-pill ${state._selectedRest===90||!state._selectedRest?'active':''}" onclick="startRestTimerWith(90)">90s</button>
          <button class="timer-pill ${state._selectedRest===120?'active':''}" onclick="startRestTimerWith(120)">120s</button>
        </div>
        <div style="text-align:right">
          <div class="text-xs" style="color:var(--text3)">Total Time</div>
          <div class="fw-700 text-green" id="workout-dur">${fmtDuration(dur)}</div>
        </div>
      </div>
      <div class="topbar-row mt-8" style="gap:16px">
        <div class="text-xs" style="color:var(--text2)">Est. ${sessionCals} cal</div>
        <div class="text-xs" style="color:var(--text2)">${s.exercises.reduce((n,ex)=>n+ex.sets.filter(ss=>ss.done).length,0)} sets done</div>
      </div>
    </div>
    ${s.exercises.map((ex,i)=>{
      const isActive=i===s.currentExIdx;
      const last=getLastPerformance(ex.exerciseId);
      const pr=getExercisePR(ex.exerciseId);
      const lastStr=last?last.sets.filter(ss=>ss.done).map(ss=>`${ss.weight}x${ss.reps}`).join(', '):'No previous data';
      const exCals=estimateCalories(ex,latestBW);
      const isCardio=ex.isCardio;

      return `
        <div class="workout-exercise-card ${isActive?'active-exercise':''}" onclick="setActiveEx(${i})">
          <div class="we-header">
            <span class="we-name">${ex.name}${pr>0?`<span class="pr-badge">PR: ${pr}</span>`:''}</span>
            <div style="display:flex;align-items:center;gap:4px">
              <span class="text-xs" style="color:var(--text3)">${exCals} cal</span>
              <button class="btn-icon" style="color:var(--red);width:28px;height:28px;font-size:14px" onclick="event.stopPropagation();removeExFromSession(${i})">${icons.trash}</button>
            </div>
          </div>
          <div class="we-last">Last: ${lastStr}</div>
          ${isCardio?`
            <div class="mb-8">
              <button class="btn mb-8" onclick="event.stopPropagation();openIntervalTimer(${i})" style="background:var(--green-dim);border:1px solid var(--green)">Start Interval Timer</button>
              <div class="set-row">
                <div class="set-num">#</div>
                <div class="set-label" style="width:60px">MIN</div>
                ${isSpeedExercise(ex.name)?'<div class="set-label" style="width:60px">MPH</div>':''}${isStepExercise(ex.name)&&!isSpeedExercise(ex.name)?'<div class="set-label" style="width:60px">SPM</div>':''}
                ${isDistExercise(ex.name)&&!isSpeedExercise(ex.name)&&!isStepExercise(ex.name)?'<div class="set-label" style="width:60px">DIST</div>':''}
                <div class="set-label" style="width:60px">CAL</div>
                <div style="width:36px"></div>
              </div>
              ${(ex.sets||[]).map((set,si)=>`
                <div class="set-row">
                  <div class="set-num">${si+1}</div>
                  <input class="set-input" style="width:60px" data-sid="cm-${i}-${si}" type="number" inputmode="numeric" value="${set.reps||''}" placeholder="0" onchange="updateSet(${i},${si},'reps',this.value)">
                  ${isSpeedExercise(ex.name)?`<input class="set-input" style="width:60px" data-sid="cmph-${i}-${si}" type="number" inputmode="decimal" value="${set.weight||''}" placeholder="0" onchange="updateSet(${i},${si},'weight',this.value)">`:''}${isStepExercise(ex.name)&&!isSpeedExercise(ex.name)?`<input class="set-input" style="width:60px" data-sid="cs-${i}-${si}" type="number" inputmode="numeric" value="${set.weight||''}" placeholder="0" onchange="updateSet(${i},${si},'weight',this.value)">`:''}
                  ${isDistExercise(ex.name)&&!isSpeedExercise(ex.name)&&!isStepExercise(ex.name)?`<input class="set-input" style="width:60px" data-sid="cd-${i}-${si}" type="number" inputmode="decimal" value="${set.weight||''}" placeholder="0" onchange="updateSet(${i},${si},'weight',this.value)">`:''}
                  <input class="set-input" style="width:60px" data-sid="cc-${i}-${si}" type="number" inputmode="numeric" value="${set.calories||''}" placeholder="0" onchange="updateSet(${i},${si},'calories',this.value)">
                  <button class="set-check ${set.done?'done':''}" onclick="event.stopPropagation();toggleSet(${i},${si})">${set.done?icons.check:''}</button>
                </div>`).join('')}
              <div style="display:flex;gap:8px;margin-top:8px">
                <button class="btn btn-sm btn-outline" style="flex:1" onclick="event.stopPropagation();addSetToExercise(${i})">+ Set</button>
                ${(ex.sets||[]).length>1?`<button class="btn btn-sm" style="width:auto;background:var(--bg4)" onclick="event.stopPropagation();removeLastSet(${i})">- Set</button>`:''}
              </div>
            </div>
          `:`
            <div>
              <div class="set-row"><div class="set-num">#</div><div class="set-label" style="width:72px">LBS</div><div class="set-label" style="width:72px">REPS</div><div style="width:36px"></div></div>
              ${ex.sets.map((set,si)=>`
                <div class="set-row">
                  <div class="set-num">${si+1}</div>
                  <input class="set-input" data-sid="w-${i}-${si}" type="number" inputmode="decimal" value="${set.weight||''}" placeholder="0" onchange="updateSet(${i},${si},'weight',this.value)">
                  <input class="set-input" data-sid="r-${i}-${si}" type="number" inputmode="numeric" value="${set.reps||''}" placeholder="0" onchange="updateSet(${i},${si},'reps',this.value)">
                  <button class="set-check ${set.done?'done':''}" onclick="event.stopPropagation();toggleSet(${i},${si})">${set.done?icons.check:''}</button>
                </div>`).join('')}
            </div>
            <div style="display:flex;gap:8px;margin-top:8px">
              <button class="btn btn-sm btn-outline" style="flex:1" onclick="event.stopPropagation();addSetToExercise(${i})">+ Set</button>
              ${ex.sets.length>1?`<button class="btn btn-sm" style="width:auto;background:var(--bg4)" onclick="event.stopPropagation();removeLastSet(${i})">- Set</button>`:''}
            </div>
          `}
        </div>`;
    }).join('')}
    <button class="btn btn-outline mt-12" onclick="addExerciseToSession()"><span style="font-size:18px">+</span> Add Exercise</button>
    <div style="height:80px"></div>
  `;
}

function setActiveEx(i){state.session.currentExIdx=i;render()}
function removeExFromSession(idx){
  state.session.exercises.splice(idx,1);
  if(state.session.currentExIdx>=state.session.exercises.length)state.session.currentExIdx=Math.max(0,state.session.exercises.length-1);
  saveSession();
  render();
}

// ============================================================
// WORKOUT DETAIL
// ============================================================
function renderWorkoutDetail(){
  const w=state.workouts.find(w=>w.id===state._viewWorkoutId);
  if(!w)return '<p>Workout not found</p>';
  const vol=calcVolume(w),dur=workoutDurationSec(w);
  const fmtSet=(ex,s)=>{
    if(!s.done)return '<span class="muted">not done</span>';
    if(ex.unit==='min'||ex.isCardio)return (s.reps||ex.durationMin||0)+' min';
    if(ex.unit==='s')return (s.weight?s.weight+' lb · ':'')+(s.secs||0)+' s'+(ex.perSide?'/side':'');
    return s.weight+' '+(ex.unit==='kg'?'kg':'lb')+' × '+s.reps+(ex.perSide?'/side':'');
  };
  return `
    <div class="sel-banner" style="border-top:4px solid ${workoutColor(w)}"><strong>${esc(w.name)}</strong><span class="num">${fmtDate(w.startTime)}</span>${w.program?`<span class="focus">${esc(w.program.weekLabel)}</span>`:''}</div>
    <div class="stats3">
      <div class="stat"><span class="num">${dur?fmtDuration(dur):'–'}</span><small>duration</small></div>
      <div class="stat"><span class="num">${doneSets(w)}</span><small>sets</small></div>
      <div class="stat"><span class="num">${vol>=1000?(vol/1000).toFixed(1)+'k':vol}</span><small>lb volume</small></div>
    </div>
    ${w.notes?`<div class="card"><span class="eyebrow">Note</span><p>${esc(w.notes)}</p></div>`:''}
    ${w.exercises.map(ex=>{
      const oldPR=w.program?null:getExercisePR(ex.exerciseId);
      const sets=ex.isCardio&&(!ex.sets||!ex.sets.length)?[{done:true,reps:ex.durationMin||0}]:ex.sets;
      return `<div class="card ex-card">
        <div class="card-h"><h3>${esc(ex.name)}</h3>${ex.skipped?'<span class="tag muted">skipped</span>':''}</div>
        <table class="sets"><tbody>${sets.map((s,i)=>{
          const pr=s.pr||(oldPR!=null&&s.done&&s.weight>0&&s.weight>=oldPR);
          return `<tr class="${s.done?'':'muted'}"><td class="sn num">${i+1}</td><td class="rx">${fmtSet(ex,s)}${pr?'<span class="badge">best</span>':''}</td></tr>`;
        }).join('')}</tbody></table>
      </div>`;
    }).join('')}
    <div class="row2 mt-16">
      <button class="btn btn-outline" onclick="editPastWorkout('${w.id}')">Edit</button>
      <button class="btn btn-danger-ghost" onclick="deleteWorkout('${w.id}')">Delete</button>
    </div>
  `;
}

// ============================================================
// EDIT PAST WORKOUT
// ============================================================
function editPastWorkout(wid){
  const w=state.workouts.find(w=>w.id===wid);
  if(!w)return;
  state._editWorkout=JSON.parse(JSON.stringify(w));
  state._editDurMin=Math.round(workoutDurationSec(w)/60)||'';
  state.subPage='edit-past-workout';
  render();
}

function renderEditPastWorkout(){
  const w=state._editWorkout;
  if(!w)return '';
  return `
    <div class="mb-12"><label class="text-sm" style="color:var(--text2);display:block;margin-bottom:4px">Workout Name</label><input type="text" data-sid="epw-name" value="${w.name}" onchange="state._editWorkout.name=this.value"></div>
    <div class="mb-16"><label class="text-sm" style="color:var(--text2);display:block;margin-bottom:4px">Session length (minutes)</label><input type="number" data-sid="epw-dur" value="${state._editDurMin}" placeholder="e.g. 60" inputmode="numeric" onchange="state._editDurMin=parseInt(this.value)||0"></div>
    ${w.exercises.map((ex,i)=>`
      <div class="card">
        <div class="flex-between mb-8"><span class="fw-700">${ex.name}</span><button style="color:var(--red);padding:4px" onclick="state._editWorkout.exercises.splice(${i},1);render()">×</button></div>
        ${ex.isCardio?`
          ${ex.sets&&ex.sets.length>0?ex.sets.map((s,si)=>`
            <div class="set-row">
              <div class="set-num">${si+1}</div>
              <div class="cardio-field"><label>MIN</label><input class="set-input" style="width:60px" data-sid="epw-cm-${i}-${si}" type="number" inputmode="numeric" value="${s.reps||''}" onchange="state._editWorkout.exercises[${i}].sets[${si}].reps=parseInt(this.value)||0"></div>
              <div class="cardio-field"><label>CAL</label><input class="set-input" style="width:60px" data-sid="epw-cc-${i}-${si}" type="number" inputmode="numeric" value="${s.calories||''}" onchange="state._editWorkout.exercises[${i}].sets[${si}].calories=parseInt(this.value)||0"></div>
              <button class="set-check ${s.done?'done':''}" onclick="state._editWorkout.exercises[${i}].sets[${si}].done=!state._editWorkout.exercises[${i}].sets[${si}].done;render()">${s.done?icons.check:''}</button>
            </div>`).join(''):`
            <div class="set-row"><span class="text-sm">Duration (min)</span><input class="set-input" data-sid="epw-cd-${i}" type="number" value="${ex.durationMin||''}" inputmode="numeric" onchange="state._editWorkout.exercises[${i}].durationMin=parseInt(this.value)||0"></div>
          `}
        `:`
          ${ex.sets.map((s,si)=>`
            <div class="set-row">
              <div class="set-num">${si+1}</div>
              <input class="set-input" data-sid="epw-w-${i}-${si}" type="number" inputmode="decimal" value="${s.weight||''}" onchange="state._editWorkout.exercises[${i}].sets[${si}].weight=parseFloat(this.value)||0">
              <input class="set-input" data-sid="epw-r-${i}-${si}" type="number" inputmode="numeric" value="${s.reps||''}" onchange="state._editWorkout.exercises[${i}].sets[${si}].reps=parseInt(this.value)||0">
              <button class="set-check ${s.done?'done':''}" onclick="state._editWorkout.exercises[${i}].sets[${si}].done=!state._editWorkout.exercises[${i}].sets[${si}].done;render()">${s.done?icons.check:''}</button>
            </div>`).join('')}
        `}
      </div>`).join('')}
  `;
}

async function savePastWorkout(){
  const w=state._editWorkout;
  // Length is stored three ways across app versions; keep them in step.
  if(state._editDurMin>0){
    w.durationSec=state._editDurMin*60;w.totalDuration=state._editDurMin;
    w.endTime=new Date(new Date(w.startTime).getTime()+w.durationSec*1000).toISOString();
  }
  const idx=state.workouts.findIndex(wk=>wk.id===w.id);
  if(idx>=0)state.workouts[idx]=w;
  await dbPut('workouts',w);
  backupToFirebase();
  state._viewWorkoutId=w.id;
  state.subPage='workout-detail';
  state._editWorkout=null;
  render();
}

// ============================================================
// MODALS
// ============================================================
function renderModals(){
  if(state.showCustomExercise)return renderCustomExerciseModal();
  if(!state.showExercisePicker)return '';
  let filtered=getAllExercises();
  if(state.libBodyFilter!=='All')filtered=filtered.filter(e=>e.body===state.libBodyFilter);
  if(state.libEquipFilter!=='All')filtered=filtered.filter(e=>e.equip===state.libEquipFilter);
  if(state.libSearch)filtered=filtered.filter(e=>e.name.toLowerCase().includes(state.libSearch.toLowerCase()));

  return `
    <div class="modal-overlay" onclick="closePicker(event)">
      <div class="modal picker-modal" onclick="event.stopPropagation()">
        <div class="flex-between mb-12"><span class="modal-title" style="margin:0">Add Exercise</span><button style="font-size:24px;color:var(--text2)" onclick="setState({showExercisePicker:false})">×</button></div>
        <div class="search-bar">${icons.search}<input type="text" data-sid="picker-search" placeholder="Search..." value="${state.libSearch}" oninput="debouncedSearch('libSearch',this.value)"></div>
        <div class="filter-row">${['All',...BODY_PARTS].map(bp=>`<button class="filter-chip ${state.libBodyFilter===bp?'active':''}" onclick="setState({libBodyFilter:'${bp}'})">${bp}</button>`).join('')}</div>
        <div class="filter-row">${['All',...EQUIPMENT].map(eq=>`<button class="filter-chip ${state.libEquipFilter===eq?'active':''}" onclick="setState({libEquipFilter:'${eq}'})">${eq}</button>`).join('')}</div>
        <div id="picker-results" style="flex:1;min-height:0;overflow-y:auto">
          ${filtered.map(ex=>`
            <div class="exercise-item" onclick="pickExercise('${ex.id}')">
              <div class="exercise-info"><div class="exercise-name">${ex.name}</div><div class="exercise-meta">${ex.body} · ${ex.equip}</div></div>
              <span class="exercise-add">+</span>
            </div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// CUSTOM EXERCISE MODAL
// ============================================================
function renderCustomExerciseModal(){
  return `<div class="modal-overlay" onclick="setState({showCustomExercise:false})">
    <div class="modal" onclick="event.stopPropagation()">
      <div class="flex-between mb-12"><span class="modal-title" style="margin:0">Create Custom Exercise</span><button style="font-size:24px;color:var(--text2)" onclick="setState({showCustomExercise:false})">×</button></div>
      <div class="mb-12"><label class="text-sm" style="color:var(--text2);display:block;margin-bottom:4px">Exercise Name</label><input type="text" id="custom-ex-name" placeholder="e.g. Zercher Curl"></div>
      <div class="mb-12"><label class="text-sm" style="color:var(--text2);display:block;margin-bottom:4px">Body Part</label><select id="custom-ex-body">${BODY_PARTS.map(bp=>`<option value="${bp}">${bp}</option>`).join('')}</select></div>
      <div class="mb-12"><label class="text-sm" style="color:var(--text2);display:block;margin-bottom:4px">Equipment</label><select id="custom-ex-equip">${EQUIPMENT.map(eq=>`<option value="${eq}">${eq}</option>`).join('')}</select></div>
      <div class="mb-12"><label style="display:flex;align-items:center;gap:8px;color:var(--text2)" class="text-sm"><input type="checkbox" id="custom-ex-cardio"> This is a cardio exercise</label></div>
      <button class="btn" onclick="saveCustomExercise()">Save Exercise</button>
    </div>
  </div>`;
}

async function saveCustomExercise(){
  const name=document.getElementById('custom-ex-name').value.trim();
  const body=document.getElementById('custom-ex-body').value;
  const equip=document.getElementById('custom-ex-equip').value;
  const isCardio=document.getElementById('custom-ex-cardio').checked;
  if(!name){alert('Enter a name');return}
  const ex={id:'custom_'+uid(),name,body,equip,isCardio,custom:true};
  customExercises.push(ex);
  await dbPut('exercises',ex);
  state.showCustomExercise=false;
  render();
}

// ============================================================
// CALORIE ESTIMATION
// ============================================================
// MET-based estimates: calories = MET * bodyWeightKg * durationHours
// For lifting: ~3-6 MET depending on intensity. We use set duration estimate.
// For cardio: ~6-12 MET depending on type.
const CARDIO_METS={'Treadmill Run':9.8,'Treadmill Walk (Incline)':6,'Treadmill Sprint Intervals':11,'Assault Bike':10.5,'Assault Bike Intervals':12,'Rowing Machine':7,'Rowing Intervals':9.5,'Stair Climber':9,'Stair Climber (Zone 2)':6.5,'Stationary Bike':7.5,'Stationary Bike Intervals':10,'Elliptical':5.5,'Outdoor Run':9.8,'Outdoor Sprint Intervals':11,'Jump Rope':11,'Battle Ropes':10,'Box Jumps':8,'Burpees':10,'Ski Erg':7.5,'4x4 Cardio on Rower':8.5,'Zone 2 Cardio on Stairs':6.5,'Norwegian 4x4':9.5};
function estimateCalories(exercise,bodyWeightLbs){
  const bwKg=(bodyWeightLbs||180)*0.4536;
  if(exercise.isCardio){
    const met=CARDIO_METS[exercise.name]||7;
    let mins=0;
    if(exercise.sets&&exercise.sets.length>0)mins=exercise.sets.reduce((s,st)=>s+(st.done?(st.reps||0):0),0);
    if(mins===0)mins=exercise.durationMin||10;
    return Math.round(met*bwKg*(mins/60));
  }
  // Strength: ~5 MET, estimate ~40s per set
  const doneSets=exercise.sets?exercise.sets.filter(s=>s.done).length:0;
  const mins=(doneSets*40)/60;
  const met=5;
  return Math.round(met*bwKg*(mins/60));
}

function getSessionCalories(session,bwLbs){
  if(!session)return 0;
  return session.exercises.reduce((sum,ex)=>sum+estimateCalories(ex,bwLbs),0);
}

// ============================================================
// ACTIONS
// ============================================================
function setState(updates){
  Object.assign(state,updates);
  render();
}

function switchTab(tab){
  state.tab=tab;state.subPage=null;state.homeWeekIdx=null;
  render();
  const c=document.getElementById('main-content');if(c)c.scrollTop=0;
}

// ============================================================
// WORKOUT SETUP (build before starting)
// ============================================================
function todayStr(){const d=new Date();return d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}

function beginWorkoutSetup(){
  if(state.session){resumeSession();return}
  state._setupWorkout={name:'Workout — '+todayStr(),exercises:[]};
  state.subPage='workout-setup';
  render();
}

function renderWorkoutSetup(){
  const w=state._setupWorkout;
  if(!w)return '';
  return `
    <div class="mb-12"><label class="text-sm" style="color:var(--text2);display:block;margin-bottom:4px">Workout Name</label><input type="text" data-sid="setup-name" value="${w.name}" onchange="state._setupWorkout.name=this.value" placeholder="e.g. Push Day"></div>
    ${w.exercises.length>0?w.exercises.map((ex,i)=>`
      <div class="card"><div class="flex-between"><div><div class="fw-700">${ex.name}</div><div class="text-xs" style="color:var(--text2)">${ex.body} · ${ex.equip}${ex.isCardio?' · '+( ex.durationMin||0)+' min':' · '+ex.sets.length+' sets'}</div></div><button style="color:var(--red);padding:8px" onclick="state._setupWorkout.exercises.splice(${i},1);render()">×</button></div></div>`).join(''):'<div class="empty-state" style="padding:30px"><p>No exercises yet. Add some below!</p></div>'}
    <button class="btn btn-outline mt-8 mb-16" onclick="addExerciseToSetup()"><span style="font-size:18px">+</span> Add Exercise</button>
    <button class="btn" onclick="launchWorkout()" style="font-size:18px;padding:16px">Start Workout</button>
  `;
}

function addExerciseToSetup(){
  state.showExercisePicker=true;
  state.pickerCallback='setup';
  state.libSearch='';state.libBodyFilter='All';state.libEquipFilter='All';
  render();
}

function cancelWorkoutSetup(){
  state._setupWorkout=null;state.subPage=null;render();
}

function launchWorkout(){
  const w=state._setupWorkout;
  if(!w||w.exercises.length===0){alert('Add at least one exercise');return}
  state.session={id:uid(),name:w.name,startTime:new Date().toISOString(),exercises:w.exercises,currentExIdx:0};
  state._setupWorkout=null;
  state.subPage='active-workout';
  saveSession();
  render();
}

// ============================================================
// INTERVAL TIMER (4×4, Norwegian 4×4, 30/30, Tabata)
// ============================================================
// Phases: optional warm-up → rounds of work/recovery → optional cool-down.
// Clock-based like every other timer: if the phone was locked through one or
// more phase changes, the tick catches up through all of them at once.
const INTERVAL_PRESETS={
  'norwegian':{warmupSeconds:300,activeSeconds:240,restSeconds:180,rounds:4,cooldownSeconds:300,hrWork:'~90% (165)',hrRecovery:'60-70%',hrWarmup:'easy (~120)',label:'Norwegian 4×4'},
  '4x4':{warmupSeconds:0,activeSeconds:240,restSeconds:180,rounds:4,cooldownSeconds:0,label:'4x4'},
  '30/30':{warmupSeconds:0,activeSeconds:30,restSeconds:30,rounds:10,cooldownSeconds:0,label:'30/30'},
  'tabata':{warmupSeconds:0,activeSeconds:20,restSeconds:10,rounds:8,cooldownSeconds:0,label:'Tabata'},
};
const CARDIO_MODALITIES=['Rower','Stairs','Assault Bike','Stationary Bike','Treadmill','Ski Erg','Outdoor Run','Elliptical'];

function newIntervalState(extra){
  return Object.assign({
    warmupSeconds:0,activeSeconds:240,restSeconds:180,rounds:4,cooldownSeconds:0,
    hrWork:'',hrRecovery:'',hrWarmup:'',modality:'',
    phase:'config',currentPhase:'active',currentRound:1,
    phaseStartedAt:null,phasePausedAccum:0,
    completedWarmupTime:0,completedActiveTime:0,completedRestTime:0,completedCooldownTime:0,
    exerciseIdx:null,preset:'4x4'
  },extra||{});
}

function applyPresetFields(it,key){
  const p=INTERVAL_PRESETS[key];if(!p)return;
  it.warmupSeconds=p.warmupSeconds||0;it.activeSeconds=p.activeSeconds;it.restSeconds=p.restSeconds;
  it.rounds=p.rounds;it.cooldownSeconds=p.cooldownSeconds||0;
  it.hrWork=p.hrWork||'';it.hrRecovery=p.hrRecovery||'';it.hrWarmup=p.hrWarmup||'';
  it.preset=key;
}

function openIntervalTimer(exIdx,forcePreset){
  const it=newIntervalState({exerciseIdx:(exIdx==null?null:exIdx)});
  let preset=forcePreset||'4x4';
  if(!forcePreset&&exIdx!=null&&state.session&&state.session.exercises[exIdx]){
    const sx=state.session.exercises[exIdx];
    const exData=getAllExercises().find(e=>e.id===sx.exerciseId);
    if((exData&&exData.isInterval)||/norwegian/i.test(sx.name||''))preset='norwegian';
  }
  applyPresetFields(it,preset);
  state.intervalTimer=it;
  state.subPage='interval-timer';
  render();
}

// Standalone Norwegian 4×4 (from the More tab): logs itself to history when done.
function openNorwegian(){
  const it=newIntervalState({exerciseIdx:null,modality:'Rower'});
  applyPresetFields(it,'norwegian');
  state.intervalTimer=it;
  state.subPage='interval-timer';
  render();
}

function setIntervalModality(v){if(state.intervalTimer)state.intervalTimer.modality=v}

function cancelIntervalTimer(){
  clearInterval(state.intervalTimerInterval);
  releaseWakeLock();
  state.intervalTimer=null;
  state.subPage=state.session?'active-workout':null;
  saveSession();
  render();
}

function applyIntervalPreset(key){
  if(!state.intervalTimer)return;
  if(key==='custom')state.intervalTimer.preset='custom';
  else applyPresetFields(state.intervalTimer,key);
  render();
}

// A lock-screen notification at each phase change, if the phone allows it.
function requestNotifyPermission(){
  try{if('Notification' in window&&Notification.permission==='default')Notification.requestPermission().catch(()=>{})}catch(e){}
}
function notifyInterval(title,body){
  try{
    if(!('Notification' in window)||Notification.permission!=='granted')return;
    const fallback=()=>{try{new Notification(title,{body:body||''})}catch(e){}};
    if(navigator.serviceWorker&&navigator.serviceWorker.ready){
      navigator.serviceWorker.ready.then(reg=>reg.showNotification(title,{body:body||'',tag:'liftinstuff-interval',renotify:true})).catch(fallback);
    }else fallback();
  }catch(e){}
}

function startIntervalTimer(){
  const it=state.intervalTimer;if(!it)return;
  unlockAudio();
  it.phase='running';
  it.currentPhase=it.warmupSeconds>0?'warmup':'active';
  it.currentRound=1;
  it.phaseStartedAt=Date.now();it.phasePausedAccum=0;
  it.completedWarmupTime=0;it.completedActiveTime=0;it.completedRestTime=0;it.completedCooldownTime=0;
  clearInterval(state.intervalTimerInterval);
  requestNotifyPermission();
  requestWakeLock();
  state.intervalTimerInterval=setInterval(intervalTimerTick,200);
  alertRound();
  saveSession();
  render();
}

function _phaseDurSec(it){
  if(it.currentPhase==='warmup')return it.warmupSeconds;
  if(it.currentPhase==='cooldown')return it.cooldownSeconds;
  if(it.currentPhase==='active')return it.activeSeconds;
  return it.restSeconds;
}

function getIntervalPhaseRemaining(){
  const it=state.intervalTimer;if(!it||it.phase==='config'||it.phase==='done')return 0;
  const elapsed=it.phasePausedAccum+(it.phase==='running'&&it.phaseStartedAt?Date.now()-it.phaseStartedAt:0);
  return Math.max(0,Math.ceil((_phaseDurSec(it)*1000-elapsed)/1000));
}

// Moves to the next phase; carryMs is how far past the end we already are.
function _advanceIntervalPhase(it,carryMs){
  const cp=it.currentPhase;let next=null;
  if(cp==='warmup'){it.completedWarmupTime+=it.warmupSeconds;next='active'}
  else if(cp==='active'){
    it.completedActiveTime+=it.activeSeconds;
    if(it.currentRound<it.rounds){if(it.restSeconds>0)next='rest';else{it.currentRound++;next='active'}}
    else if(it.cooldownSeconds>0)next='cooldown';
    else return 'done';
  }else if(cp==='rest'){
    it.completedRestTime+=it.restSeconds;
    if(it.currentRound<it.rounds){it.currentRound++;next='active'}
    else if(it.cooldownSeconds>0)next='cooldown';
    else return 'done';
  }else if(cp==='cooldown'){it.completedCooldownTime+=it.cooldownSeconds;return 'done'}
  it.currentPhase=next;it.phaseStartedAt=Date.now();it.phasePausedAccum=carryMs||0;
  saveSession();
  return 'continue';
}

function _onIntervalPhaseEntered(it){
  const labels={warmup:'Warm up',active:'Work — GO!',rest:'Recover',cooldown:'Cool down'};
  const r=(it.currentPhase==='active'||it.currentPhase==='rest')?(' (Round '+it.currentRound+'/'+it.rounds+')'):'';
  alertRound();
  notifyInterval('LiftinStuff — '+(labels[it.currentPhase]||'')+r,it.modality||'');
}

function intervalTimerTick(){
  const it=state.intervalTimer;if(!it||it.phase!=='running')return;
  let transitioned=false,guard=0;
  while(guard++<300){
    const elapsed=it.phasePausedAccum+(it.phaseStartedAt?Date.now()-it.phaseStartedAt:0);
    const remMs=_phaseDurSec(it)*1000-elapsed;
    if(remMs>0){
      if(transitioned){_onIntervalPhaseEntered(it);render();return}
      const remaining=Math.ceil(remMs/1000);
      const key=remaining+'-'+it.currentRound+it.currentPhase;
      if(remaining<=3&&it._lastCount!==key){it._lastCount=key;alertCountdown(remaining)}
      const tEl=document.getElementById('interval-time');
      if(tEl)tEl.textContent=fmtTime(remaining);
      return;
    }
    if(_advanceIntervalPhase(it,-remMs)==='done'){completeIntervalTimer();return}
    transitioned=true;
  }
}

function pauseIntervalTimer(){
  const it=state.intervalTimer;if(!it||it.phase!=='running')return;
  it.phasePausedAccum+=Date.now()-it.phaseStartedAt;
  it.phaseStartedAt=null;
  it.phase='paused';
  clearInterval(state.intervalTimerInterval);
  saveSession();render();
}

function resumeIntervalTimer(){
  const it=state.intervalTimer;if(!it||it.phase!=='paused')return;
  it.phaseStartedAt=Date.now();
  it.phase='running';
  state.intervalTimerInterval=setInterval(intervalTimerTick,200);
  requestWakeLock();
  saveSession();render();
}

function completeIntervalTimer(){
  const it=state.intervalTimer;if(!it)return;
  clearInterval(state.intervalTimerInterval);
  it.phase='done';
  alertEnd();
  notifyInterval('LiftinStuff — Interval complete!',(it.rounds||'')+' rounds done'+(it.modality?' · '+it.modality:''));
  releaseWakeLock();
  if(it.exerciseIdx!=null&&state.session&&state.session.exercises[it.exerciseIdx]){
    // Auto-fill the cardio exercise's MIN field
    const ex=state.session.exercises[it.exerciseIdx];
    const activeMins=Math.round(it.completedActiveTime/60);
    if(ex.sets&&ex.sets.length>0){ex.sets[0].reps=activeMins;ex.sets[0].done=true}
  }else if(it.exerciseIdx==null&&!state.session){
    it.loggedToHistory=true;
    _logIntervalWorkout(it);
  }
  saveSession();render();
}

async function _logIntervalWorkout(it){
  try{
    const totalSec=(it.completedWarmupTime||0)+(it.completedActiveTime||0)+(it.completedRestTime||0)+(it.completedCooldownTime||0);
    const totalMin=Math.max(1,Math.round(totalSec/60));
    const end=new Date(),start=new Date(end.getTime()-totalSec*1000);
    const p=INTERVAL_PRESETS[it.preset];
    const label=it.preset==='norwegian'?'Norwegian 4×4':(p&&p.label?p.label+' Intervals':'Interval Session');
    const workout={
      id:uid(),
      name:it.modality?label+' — '+it.modality:label,
      startTime:start.toISOString(),endTime:end.toISOString(),currentExIdx:0,
      exercises:[{exerciseId:'cd22',name:'Norwegian 4x4',body:'Cardio',equip:'Cardio Machine',isCardio:true,
        sets:[{reps:totalMin,weight:0,calories:0,done:true}]}]
    };
    state.workouts.push(workout);
    await dbPut('workouts',workout);
    backupToFirebase();
    render();
  }catch(e){console.warn('[Interval] could not save to history',e)}
}

function endIntervalTimerAndReturn(){
  clearInterval(state.intervalTimerInterval);
  releaseWakeLock();
  state.intervalTimer=null;
  state.subPage=state.session?'active-workout':null;
  saveSession();render();
}

function minSecInputs(field){
  const it=state.intervalTimer,v=it[field];
  return `<div style="display:flex;align-items:center;gap:12px">
    <input type="number" data-sid="it-${field}-m" value="${Math.floor(v/60)}" style="width:60px;text-align:center" inputmode="numeric" onchange="state.intervalTimer.${field}=(parseInt(this.value)||0)*60+(state.intervalTimer.${field}%60);state.intervalTimer.preset='custom'"> <span class="text-sm" style="color:var(--text2)">min</span>
    <input type="number" data-sid="it-${field}-s" value="${v%60}" style="width:60px;text-align:center" inputmode="numeric" onchange="state.intervalTimer.${field}=Math.floor(state.intervalTimer.${field}/60)*60+(parseInt(this.value)||0);state.intervalTimer.preset='custom'"> <span class="text-sm" style="color:var(--text2)">sec</span>
  </div>`;
}

function renderIntervalTimer(){
  const it=state.intervalTimer;
  if(!it)return '<p>No timer configured</p>';

  // CONFIG screen
  if(it.phase==='config'){
    const isNor=it.preset==='norwegian';
    return `<div class="interval-config">
      ${isNor?`<div class="card" style="border:1px solid var(--accent)">
        <div class="card-title mb-4">Norwegian 4×4</div>
        <div class="text-sm" style="color:var(--text2)">Warm-up → 4 × (4 min hard / 3 min easy) → cool-down</div>
        <div class="text-sm mt-8" style="color:var(--text2)">Work HR ${esc(it.hrWork)} · Recovery ${esc(it.hrRecovery)}</div>
      </div>`:''}
      <div class="card">
        <div class="card-title mb-12">Exercise / Modality</div>
        <select onchange="setIntervalModality(this.value)" style="width:100%;min-height:48px;padding:10px;background:var(--bg);color:var(--ink);border:1px solid var(--line)">
          <option value="">— none —</option>
          ${CARDIO_MODALITIES.map(m=>`<option value="${m}" ${it.modality===m?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
      <div class="card"><div class="card-title mb-12">Warm-up</div>${minSecInputs('warmupSeconds')}</div>
      <div class="card"><div class="card-title mb-12">Active Period</div>${minSecInputs('activeSeconds')}</div>
      <div class="card"><div class="card-title mb-12">Rest / Recovery</div>${minSecInputs('restSeconds')}</div>
      <div class="card"><div class="card-title mb-12">Cool-down</div>${minSecInputs('cooldownSeconds')}</div>
      <div class="card">
        <div class="card-title mb-12">Rounds</div>
        <input type="number" data-sid="it-rounds" value="${it.rounds}" style="width:80px;text-align:center" inputmode="numeric" onchange="state.intervalTimer.rounds=parseInt(this.value)||1;state.intervalTimer.preset='custom'">
      </div>
      <div class="card-title mb-8">Presets</div>
      <div class="preset-row">
        <button class="preset-btn ${it.preset==='norwegian'?'active':''}" onclick="applyIntervalPreset('norwegian')">Norwegian 4×4</button>
        <button class="preset-btn ${it.preset==='4x4'?'active':''}" onclick="applyIntervalPreset('4x4')">4x4</button>
        <button class="preset-btn ${it.preset==='30/30'?'active':''}" onclick="applyIntervalPreset('30/30')">30/30</button>
        <button class="preset-btn ${it.preset==='tabata'?'active':''}" onclick="applyIntervalPreset('tabata')">Tabata</button>
        <button class="preset-btn ${it.preset==='custom'?'active':''}" onclick="applyIntervalPreset('custom')">Custom</button>
      </div>
      <button class="btn mt-16" style="font-size:18px;padding:16px" onclick="startIntervalTimer()">START</button>
    </div>`;
  }

  // DONE screen
  if(it.phase==='done'){
    const totalActive=it.completedActiveTime,totalRest=it.completedRestTime;
    const totalWarm=it.completedWarmupTime||0,totalCool=it.completedCooldownTime||0;
    const totalTime=totalWarm+totalActive+totalRest+totalCool;
    return `<div class="interval-fs" style="background:var(--bg)">
      <div style="font-size:32px;font-weight:800;color:var(--green-bright);margin-bottom:24px">DONE!</div>
      ${it.modality?`<div class="text-sm mb-8" style="color:var(--text2)">${esc(it.modality)}</div>`:''}
      <div class="text-sm mb-8" style="color:var(--text2)">${it.rounds} rounds completed</div>
      ${it.loggedToHistory?'<div class="text-sm mb-8" style="color:var(--green-bright)">✓ Saved to history</div>':''}
      <div class="fw-700 mb-4" style="font-size:20px">${fmtTime(totalTime)} total time</div>
      <div class="text-sm mb-24" style="color:var(--text2)">${fmtTime(totalActive)} work / ${fmtTime(totalRest)} recovery${(totalWarm||totalCool)?` · ${fmtTime(totalWarm)} warm-up / ${fmtTime(totalCool)} cool-down`:''}</div>
      <button class="if-btn" style="background:var(--green);color:#fff" onclick="endIntervalTimerAndReturn()">${state.session?'Save & Return to Workout':'Done'}</button>
    </div>`;
  }

  // RUNNING / PAUSED screen (fullscreen)
  const cp=it.currentPhase;
  const isPaused=it.phase==='paused';
  const remaining=getIntervalPhaseRemaining();
  const meta=({
    warmup:{label:'WARM UP',bg:'var(--surface)',fg:'var(--yellow)',hr:it.hrWarmup},
    active:{label:'GO',bg:'var(--accent)',fg:'var(--on-accent)',hr:it.hrWork},
    rest:{label:'RECOVER',bg:'var(--bg)',fg:'var(--accent)',hr:it.hrRecovery},
    cooldown:{label:'COOL DOWN',bg:'var(--surface)',fg:'var(--blue)',hr:it.hrWarmup},
  })[cp]||{label:'GO',bg:'var(--accent)',fg:'var(--on-accent)',hr:''};
  const roundTxt=(cp==='active'||cp==='rest')?`ROUND ${it.currentRound}/${it.rounds}`:meta.label;
  const sub=[it.modality,meta.hr?`HR ${meta.hr}`:''].filter(Boolean).map(esc).join('  ·  ');

  if(isPaused){
    return `<div class="interval-fs" style="background:var(--surface)">
      <div class="if-round" style="color:var(--text2)">${roundTxt}</div>
      <div class="if-time" style="color:var(--text)">${fmtTime(remaining)}</div>
      <div class="if-label" style="color:var(--text2)">PAUSED</div>
      <div style="display:flex;gap:12px;margin-top:40px">
        <button class="if-btn" style="background:var(--green);color:#fff" onclick="resumeIntervalTimer()">Resume</button>
        <button class="if-btn" style="background:var(--red);color:#fff" onclick="endIntervalTimerAndReturn()">End Timer</button>
      </div>
    </div>`;
  }

  return `<div class="interval-fs" style="background:${meta.bg}">
    <div class="if-round" style="color:${meta.fg}">${roundTxt}</div>
    <div class="if-time" style="color:${meta.fg}" id="interval-time">${fmtTime(remaining)}</div>
    <div class="if-label" style="color:${meta.fg}">${meta.label}</div>
    ${sub?`<div style="margin-top:8px;font-size:14px;font-weight:600;opacity:.85;color:${meta.fg}">${sub}</div>`:''}
    <button class="if-btn" style="background:${cp==='active'?'rgba(0,0,0,.2)':'rgba(255,255,255,.12)'};color:${meta.fg}" onclick="pauseIntervalTimer()">PAUSE</button>
  </div>`;
}

function addExerciseToSession(){
  state.showExercisePicker=true;
  state.pickerCallback='session';
  state.libSearch='';state.libBodyFilter='All';state.libEquipFilter='All';
  render();
}

function pickExercise(exId){
  const ex=getAllExercises().find(e=>e.id===exId);
  if(!ex)return;
  const newEx=ex.isCardio
    ?{exerciseId:ex.id,name:ex.name,body:ex.body,equip:ex.equip,isCardio:true,sets:[{reps:0,weight:0,calories:0,done:false}]}
    :{exerciseId:ex.id,name:ex.name,body:ex.body,equip:ex.equip,sets:[{weight:0,reps:0,done:false},{weight:0,reps:0,done:false},{weight:0,reps:0,done:false}]};

  if(state.pickerCallback==='session'){
    state.session.exercises.push(newEx);
    saveSession();
  } else if(state.pickerCallback==='setup'){
    state._setupWorkout.exercises.push(newEx);
  }
  state.showExercisePicker=false;
  render();
}

function closePicker(e){if(e.target.classList.contains('modal-overlay'))setState({showExercisePicker:false})}

// (cardio duration now handled via set-based UI)

function updateSet(exIdx,setIdx,field,value){
  state.session.exercises[exIdx].sets[setIdx][field]=parseFloat(value)||0;
  saveSession();
}

function toggleSet(exIdx,setIdx){
  const set=state.session.exercises[exIdx].sets[setIdx];
  set.done=!set.done;
  if(set.done){
    const ex=state.session.exercises[exIdx];
    const allDone=ex.sets.every(s=>s.done);
    if(allDone&&exIdx<state.session.exercises.length-1){
      state.session.currentExIdx=exIdx+1;
    }
  }
  saveSession();
  render();
}

function addSetToExercise(exIdx){
  const ex=state.session.exercises[exIdx];
  const lastSet=ex.sets[ex.sets.length-1];
  if(ex.isCardio){
    ex.sets.push({reps:lastSet?.reps||0,weight:lastSet?.weight||0,calories:lastSet?.calories||0,done:false});
  }else{
    ex.sets.push({weight:lastSet?.weight||0,reps:lastSet?.reps||0,done:false});
  }
  saveSession();
  render();
}

function removeLastSet(exIdx){
  if(state.session.exercises[exIdx].sets.length>1)state.session.exercises[exIdx].sets.pop();
  saveSession();
  render();
}


function timerTick(){
  const remaining=getTimerRemaining();
  if(remaining<=0){
    clearInterval(state.timerInterval);state.timerRunning=false;
    state.timerStartedAt=null;state.timerPausedAccumulated=0;state.timerTargetSeconds=0;
    alertEnd();
    saveSession();
    render();
  }else{
    if(remaining<=3&&state._lastCount!==remaining){state._lastCount=remaining;alertCountdown(remaining)}
    const ftEl=document.querySelector('.ft-time');
    if(ftEl)ftEl.textContent=fmtTime(remaining);
  }
}

function startRestTimerWith(secs){
  unlockAudio();state._lastCount=null;
  state._selectedRest=secs;
  state.timerTargetSeconds=secs;
  state.timerStartedAt=Date.now();
  state.timerPausedAccumulated=0;
  state.timerRunning=true;
  clearInterval(state.timerInterval);
  state.timerInterval=setInterval(timerTick,1000);
  saveSession();
  render();
}

function startRestTimer(){
  startRestTimerWith(state._selectedRest||state.defaultRestTime);
}

function toggleTimer(){
  if(state.timerRunning){
    state.timerPausedAccumulated+=Date.now()-state.timerStartedAt;
    state.timerStartedAt=null;
    clearInterval(state.timerInterval);state.timerRunning=false;
  }else{
    state.timerStartedAt=Date.now();
    state.timerRunning=true;
    state.timerInterval=setInterval(timerTick,1000);
  }
  saveSession();
  render();
}

function resetTimer(){
  clearInterval(state.timerInterval);
  state.timerRunning=false;state.timerStartedAt=null;state.timerPausedAccumulated=0;state.timerTargetSeconds=0;
  saveSession();
  render();
}

function confirmEndWorkout(){
  if(confirm('Discard this workout?')){
    clearInterval(state.timerInterval);
    state.session=null;state.subPage=null;
    state.timerRunning=false;state.timerStartedAt=null;state.timerPausedAccumulated=0;state.timerTargetSeconds=0;
    state.intervalTimer=null;clearInterval(state.intervalTimerInterval);
    dbDelete('activeSession','current').catch(()=>{});
    render();
  }
}

async function finishWorkout(){
  if(!state.session||state.session.exercises.length===0){alert('Add at least one exercise');return}
  const name=prompt('Name this workout:',state.session.name);
  if(name===null)return;
  state.session.name=name||state.session.name;
  state.session.endTime=new Date().toISOString();
  clearInterval(state.timerInterval);
  state.timerRunning=false;state.timerStartedAt=null;state.timerPausedAccumulated=0;state.timerTargetSeconds=0;
  state.intervalTimer=null;clearInterval(state.intervalTimerInterval);

  const workout={...state.session};
  state.workouts.push(workout);
  await dbPut('workouts',workout);
  backupToFirebase();

  state.session=null;state.subPage=null;
  dbDelete('activeSession','current').catch(()=>{});
  render();
}

async function finishWorkoutAuto(){
  if(!state.session)return;
  state.session.endTime=state.session.endTime||new Date().toISOString();
  const workout={...state.session};
  state.workouts.push(workout);
  await dbPut('workouts',workout);
  backupToFirebase();
  state.session=null;state.subPage=null;
  clearInterval(state.timerInterval);
  state.timerRunning=false;state.timerStartedAt=null;state.timerPausedAccumulated=0;state.timerTargetSeconds=0;
  state.intervalTimer=null;clearInterval(state.intervalTimerInterval);
  dbDelete('activeSession','current').catch(()=>{});
  render();
}

// History
function viewWorkout(wid){
  state._detailFrom=state.subPage==='lift'?'lift':null;
  state._viewWorkoutId=wid;
  state.subPage='workout-detail';
  render();
}

async function deleteWorkout(wid){
  if(!confirm('Delete this workout? This cannot be undone.'))return;
  state.workouts=state.workouts.filter(w=>w.id!==wid);
  await dbDelete('workouts',wid);
  backupToFirebase();
  state.subPage=null;
  render();
}

// Body weight — unified function using data-sid
async function logBW(sid){
  const input=document.querySelector('[data-sid="'+sid+'"]');
  if(!input){alert('Input not found');return}
  const w=parseFloat(input.value);
  if(!w||w<=0){alert('Enter a valid weight');return}
  const entry={date:dayKey(new Date()),weight:w};
  state.bodyweights=state.bodyweights.filter(b=>b.date!==entry.date);
  state.bodyweights.push(entry);
  await dbPut('bodyweight',entry);
  backupToFirebase();
  render();
}

// Export/Import
async function exportData(){
  const exp=await exportAllData();
  downloadJSON(exp,'liftinstuff-backup-'+dayKey(new Date())+'.json');
  await dbPut('settings',{key:'lastExport',value:exp.exportedAt});
  state.lastExport=exp.exportedAt;render();
}

// ============================================================
// EVENT BINDING
// ============================================================
function attachEvents(){
  // Duration counter for active workout - updates DOM directly, no re-render
  if(state.subPage==='active-workout'&&state.session){
    clearInterval(window._durInterval);
    window._durInterval=setInterval(()=>{
      const durEl=document.getElementById('workout-dur');
      if(durEl&&state.session){
        const dur=Math.floor((Date.now()-new Date(state.session.startTime).getTime())/1000);
        durEl.textContent=fmtDuration(dur);
      }
    },1000);
  }else{
    clearInterval(window._durInterval);
  }
  // Keep the screen on for the whole of any session, released when it ends.
  if(state.session)requestWakeLock();else releaseWakeLock();
  ensureRunTicker();
}

// ============================================================
// SESSION PERSISTENCE (IndexedDB, written after every change)
// ============================================================
function saveSession(){
  if(state.session){
    const data={
      session:state.session,
      timerStartedAt:state.timerStartedAt,
      timerPausedAccumulated:state.timerPausedAccumulated,
      timerTargetSeconds:state.timerTargetSeconds,
      timerRunning:state.timerRunning,
      subPage:state.subPage,
      intervalTimer:state.intervalTimer
    };
    dbPut('activeSession',{key:'current',...JSON.parse(JSON.stringify(data))}).catch(e=>console.warn('[Session] save failed',e));
  }else{
    dbDelete('activeSession','current').catch(()=>{});
  }
}

async function restoreSession(){
  const data=await dbGet('activeSession','current');
  if(!data)return;
  try{
    if(!data.session)return;

    // Quick workouts auto-stop after 3 hours. Program sessions (a hike can
    // run 2 h) stay open until you finish or discard them.
    const sessionStart=new Date(data.session.startTime).getTime();
    if(data.session.kind!=='program'&&Date.now()-sessionStart>3*60*60*1000){
      state.session=data.session;
      state.session.endTime=new Date(sessionStart+3*60*60*1000).toISOString();
      finishWorkoutAuto();
      return;
    }

    state.session=data.session;
    state.subPage=data.subPage||(data.session.kind==='program'?'run':'active-workout');
    if(data.session.kind==='program')return;  // its timer lives on the session; ensureRunTicker picks it up

    // Restore rest timer
    if(data.timerRunning&&data.timerStartedAt){
      state.timerStartedAt=data.timerStartedAt;
      state.timerPausedAccumulated=data.timerPausedAccumulated||0;
      state.timerTargetSeconds=data.timerTargetSeconds||0;
      state.timerRunning=true;
      const remaining=getTimerRemaining();
      if(remaining<=0){
        state.timerRunning=false;state.timerStartedAt=null;
        state.timerPausedAccumulated=0;state.timerTargetSeconds=0;
      }else{
        state.timerInterval=setInterval(timerTick,1000);
      }
    }

    // Restore interval timer
    if(data.intervalTimer){
      state.intervalTimer=data.intervalTimer;
      if(state.intervalTimer.phase==='running'){
        state.intervalTimerInterval=setInterval(intervalTimerTick,200);
      }
    }
  }catch(e){
    console.warn('[Session] restore failed',e);
    dbDelete('activeSession','current').catch(()=>{});
  }
}

function checkAutoStop(){
  if(state.session&&state.session.kind!=='program'){
    const sessionStart=new Date(state.session.startTime).getTime();
    if(Date.now()-sessionStart>3*60*60*1000){
      finishWorkoutAuto();
    }
  }
}

document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState!=='visible')return;
  // Timers are clock-based, so a re-render is all it takes to show the right time.
  if(state.intervalTimer&&state.intervalTimer.phase==='running'){requestWakeLock();intervalTimerTick()}
  if(state.session&&state.session.kind!=='program'&&state.timerRunning)render();
  checkAutoStop();
});

// ============================================================
// FIREBASE DATA BACKUP & RESTORE
// ============================================================
// Backs up all user data to Firebase so it survives cache clears,
// device switches, or code updates. Restore runs on init if local is empty.

function backupToFirebase(){
  if(!fbDb||!currentUser)return;
  const ref=fbDb.ref('users/'+currentUser);
  const data={
    workouts:{},templates:{},templatesArchive:{},bodyweights:{},goals:{},
    settings:{defaultRestTime:state.defaultRestTime,program:state.program,alerts:{...alertPrefs}},
    lastBackup:Date.now()
  };
  for(const w of state.workouts)data.workouts[w.id]=w;
  for(const t of state.templates)data.templates[t.id]=t;
  for(const t of state.templatesArchive)data.templatesArchive[t.id]=t;
  for(const b of state.bodyweights)data.bodyweights[b.date]=b;
  for(const g of state.goals)data.goals[g.id]=g;
  // Firebase refuses any `undefined` value and throws straight away, which used
  // to stop whatever called this (e.g. Save session). The JSON round trip drops
  // undefined fields, and a failed backup is only ever logged.
  try{
    ref.set(JSON.parse(JSON.stringify(data))).then(()=>console.log('[Backup] Synced to Firebase')).catch(e=>console.warn('[Backup] Failed:',e));
  }catch(e){console.warn('[Backup] Failed:',e)}
}

async function restoreFromFirebase(){
  if(!fbDb||!currentUser)return false;
  try{
    const snapshot=await fbDb.ref('users/'+currentUser).once('value');
    const data=snapshot.val();
    if(!data)return false;

    let restored=false;

    if(data.workouts&&state.workouts.length===0){
      const workouts=Object.values(data.workouts);
      for(const w of workouts){state.workouts.push(w);await dbPut('workouts',w)}
      if(workouts.length>0)restored=true;
      console.log('[Restore] '+workouts.length+' workouts from Firebase');
    }
    // Program templates are built in, so cloud templates only ever go to the archive.
    if(data.templatesArchive||data.templates){
      const archived=Object.values(data.templatesArchive||data.templates);
      for(const t of archived)await dbPut('templatesArchive',t);
    }
    if(data.bodyweights&&state.bodyweights.length===0){
      const bws=Object.values(data.bodyweights);
      for(const b of bws){state.bodyweights.push(b);await dbPut('bodyweight',b)}
      if(bws.length>0)restored=true;
      console.log('[Restore] '+bws.length+' bodyweight entries from Firebase');
    }
    if(data.goals&&state.goals.length===0){
      const goals=Object.values(data.goals);
      for(const g of goals){state.goals.push(g);await dbPut('goals',g)}
      if(goals.length>0)restored=true;
      console.log('[Restore] '+goals.length+' goals from Firebase');
    }
    if(data.settings&&data.settings.program&&!(await dbGet('settings','program'))){
      state.program={...JSON.parse(JSON.stringify(DEFAULT_PROGRAM)),...data.settings.program};
      await dbPut('settings',state.program);restored=true;
    }
    if(data.settings&&data.settings.defaultRestTime){
      state.defaultRestTime=data.settings.defaultRestTime;
      await dbPut('settings',{key:'defaultRestTime',value:data.settings.defaultRestTime});
    }

    return restored;
  }catch(e){
    console.warn('[Restore] Failed:',e);
    return false;
  }
}

// ============================================================
// INIT
// ============================================================
async function seedProgramTemplates(){
  const ids=Object.keys(SESSION_META);
  const wk=weekAt(0,state.program);
  for(const old of state.templates)if(!ids.includes(old.id))await dbDelete('templates',old.id);
  const seeded=[];
  for(const id of ids){
    const sess=buildSession(id,wk,state.program);
    const t={id,name:sess.name,program:true,category:sess.cat,
      exercises:sess.steps.flatMap(st=>st.exs.map(e=>({exerciseId:e.exerciseId,name:e.name,body:e.body,equip:e.equip,isCardio:e.isCardio,kind:st.kind})))};
    seeded.push(t);await dbPut('templates',t);
  }
  state.templates=seeded;
}

async function initApp(){
  await openDB();

  // Load custom exercises
  customExercises=await dbGetAll('exercises');

  state.templates=await dbGetAll('templates');
  state.templatesArchive=await dbGetAll('templatesArchive');
  state.workouts=await dbGetAll('workouts');
  state.bodyweights=await dbGetAll('bodyweight');
  state.goals=await dbGetAll('goals');

  const restSetting=await dbGet('settings','defaultRestTime');
  if(restSetting)state.defaultRestTime=restSetting.value;

  // Program settings (weights, calendar), alert toggles, backup reminders
  const prog=await dbGet('settings','program');
  const base=JSON.parse(JSON.stringify(DEFAULT_PROGRAM));
  state.program=prog?{...base,...prog,W:{...base.W,...prog.W},acc:{...base.acc,...prog.acc},accReady:{...(prog.accReady||{})}}:base;
  const alerts=await dbGet('settings','alerts');
  if(alerts)Object.assign(alertPrefs,alerts.value);
  const lastExport=await dbGet('settings','lastExport');
  state.lastExport=lastExport?lastExport.value:null;
  state.backups=(await dbGetAll('backups')).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  state.pendingBackup=state.backups.find(b=>!b.acknowledged&&b.fromVersion<3)||null;

  // The program's sessions are the only templates (the engine fills in each week's numbers).
  await seedProgramTemplates();

  // Ask the browser not to evict our data under storage pressure.
  if(navigator.storage&&navigator.storage.persist){
    try{state.storagePersisted=await navigator.storage.persisted()||await navigator.storage.persist()}catch(e){}
  }

  // Restore an in-progress session (survives reloads and crashes)
  await restoreSession();

  // Init Firebase, then restore from cloud if local is empty, or backup if local has data
  initFirebase();
  if(fbDb){
    const hasLocalData=state.workouts.length>0;
    if(!hasLocalData){
      restoreFromFirebase().then(restored=>{
        if(restored)render();
      });
    }else{
      backupToFirebase();
    }
  }

  render();
}


