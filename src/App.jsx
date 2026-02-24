import { useState, useRef, useEffect } from "react";
import { BookOpen, Users, Map, Heart, CheckSquare, FileText, MessageCircle, ChevronDown, ChevronRight, ArrowLeft, LogOut, Sun, Shield, Coffee, Plane, BookMarked, Calendar, Linkedin, Globe, Star, Building2, Lock, Plus, Trash2, Eye, Copy, X, Check } from "lucide-react";

const C = {
  charcoal:"#0F1B1F", forest:"#26544F", indigo:"#394B99",
  lavender:"#B1A5F7", lightLavender:"#D8D2FB",
  mint:"#A7CF99", lightMint:"#D3E7CC",
  peach:"#EBA89B", lightPeach:"#F5D3CD",
  sand:"#F0ECE9", taupe:"#9C9283", brick:"#5C1E37",
  orange:"#F0702E", white:"#FFFFFF",
  dark:"#0a1214", darkCard:"#111b1e", darkBorder:"#1e2d31",
};

const ADMIN_PASSWORD = "cartwheel2026";

// ── Wheel Mark ────────────────────────────────────────────────
function WheelMark({ size=28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {[45,135,225,315].map(a=>(
        <rect key={a} x="46" y="4" width="8" height="92" rx="4" fill={C.lavender}
          style={{transformOrigin:"50px 50px",transform:`rotate(${a}deg)`}}/>
      ))}
      {[0,90].map(a=>(
        <rect key={a} x="46" y="4" width="8" height="92" rx="4" fill={C.orange}
          style={{transformOrigin:"50px 50px",transform:`rotate(${a}deg)`}}/>
      ))}
    </svg>
  );
}

function Wordmark({ light=false, size="md" }) {
  const fs = size==="sm" ? 16 : 19;
  const ws = size==="sm" ? 22 : 28;
  return (
    <div style={{display:"flex",alignItems:"center",gap:9}}>
      <WheelMark size={ws}/>
      <div>
        <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:fs,color:light?C.white:C.charcoal,letterSpacing:"-0.3px"}}>Cartwheel</span>
        <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:400,fontSize:fs-4,color:light?"rgba(255,255,255,0.5)":C.taupe,marginLeft:6,letterSpacing:"0.5px",textTransform:"uppercase"}}>Copilot</span>
      </div>
    </div>
  );
}

// ── API ───────────────────────────────────────────────────────
async function callClaude(system, messages, maxTokens=3000) {
  const res = await fetch("/api/chat", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,system,messages}),
  });
  const d = await res.json();
  return d.content?.[0]?.text || "";
}

// ── Storage ───────────────────────────────────────────────────
async function saveRole(role) {
  try {
    await window.storage.set(`role:${role.slug}`, JSON.stringify(role));
    let idx=[];
    try{const r=await window.storage.get("role-index");if(r)idx=JSON.parse(r.value);}catch(e){}
    if(!idx.includes(role.slug))idx.push(role.slug);
    await window.storage.set("role-index",JSON.stringify(idx));
  } catch(e){}
}
async function loadAllRoles() {
  let idx=[];
  try{const r=await window.storage.get("role-index");if(r)idx=JSON.parse(r.value);}catch(e){}
  const roles=[];
  for(const slug of idx){
    try{const r=await window.storage.get(`role:${slug}`);if(r)roles.push(JSON.parse(r.value));}catch(e){}
  }
  return roles;
}
async function deleteRole(slug) {
  try{await window.storage.delete(`role:${slug}`);}catch(e){}
  let idx=[];
  try{const r=await window.storage.get("role-index");if(r)idx=JSON.parse(r.value);}catch(e){}
  await window.storage.set("role-index",JSON.stringify(idx.filter(s=>s!==slug)));
}

const PARSE_SYSTEM = `Extract structured data from a Cartwheel hiring package. Return ONLY valid JSON:
{
  "title":"Job title","slug":"url-slug","department":"Dept","reportsto":"Name, Title",
  "location":"Location","employment":"Full-Time, W2","comp":"$X-$Y",
  "mission":"1-2 sentence role mission",
  "stats":[{"n":"350+","label":"School Districts","sub":"Serving 2.5% of U.S. districts"}],
  "team":["Name - Title"],"stages":[{"stage":"Name","time":"30m","who":"Person","focus":"Focus"}],
  "contacts":["Role: Name - email"],"prep":["tip"],"thrive":["item"],"notfor":["item"],
  "success":[{"period":"First 90 Days","desc":"..."}],
  "mustHave":["req"],"niceToHave":["nice"],
  "whatYoullDo":[{"label":"Section","bullets":["bullet"]}],
  "aboutRole":"overview","compBenefits":"comp summary",
  "stagePrepData":[{"stage":"Stage","prep":["tip"],"questions":["q"]}],
  "checklist":[{"stage":"Before Stage","items":["item"]}],
  "interviewers":[{"label":"Stage","name":"Name","title":"Title","href":"linkedin or null","hrefs":null}],
  "links":{"cartwheel":"https://www.cartwheel.org","wallOfLove":"https://www.cartwheel.org/wall-of-love","glassdoor":null,"linkedin":"https://www.linkedin.com/company/cartwheelcare/posts/?feedView=all"}
}
Return ONLY valid JSON, no markdown.`;

// ── Demo Roles ────────────────────────────────────────────────
const PDA_ROLE = {
  title:"Principal Data Analyst", slug:"principal-data-analyst",
  department:"Data", reportsto:"Jacob Savos, Director of Data",
  location:"Remote", employment:"Full-Time, W2", comp:"$170,000 - $210,000",
  mission:"Shape the analytics foundation that helps Cartwheel understand and improve how mental health care reaches students. Your work connects data decisions to real outcomes for kids.",
  stats:[{n:"350+",label:"School Districts",sub:"Serving 2.5% of U.S. districts"},{n:"$20M",label:"in ARR",sub:"Achieved in just 3 years"},{n:"300%",label:"YoY Growth",sub:"Capital-efficient scale"},{n:"1.5M",label:"Students",sub:"Enrolled across districts"}],
  team:["Jacob Savos — Director of Data (your hiring manager)","1 Analytics Manager","1 Senior Data Analyst","1 Staff Data Engineer","You — senior IC thought partner to Jacob"],
  stages:[
    {stage:"Recruiter Screen",time:"30m",who:"Caroline Colpini",focus:"Role fit, values, compensation"},
    {stage:"Hiring Manager",time:"30m",who:"Jacob Savos",focus:"Systems thinking, data modeling, strategic partnership"},
    {stage:"Take-Home Exercise",time:"60-90m",who:"",focus:"SQL proficiency + analytical proposal"},
    {stage:"Case Study Review",time:"60m",who:"Nicholas Franchetti",focus:"Take-home review, data integrity, dashboards"},
    {stage:"Business Acumen",time:"30m",who:"Sam Blumpkin + Sam Bilow",focus:"Structured reasoning, business scenarios"},
    {stage:"Exec Review",time:"30m",who:"Daniel Ilkovich, CTO",focus:"Final alignment"},
  ],
  contacts:["Recruiter: Caroline Colpini - caroline.colpini@cartwheelcare.org","Coordinator: Avery Henry - avery.henry@cartwheelcare.org","Take-home questions: Jacob Savos - jacob.savos@cartwheelcare.org"],
  prep:["Bring 1-2 examples of analytics systems you have owned end-to-end","Walk through context, approach, tradeoffs, validation, and impact","Think about how your work scales — we care about foundations, not one-off outputs","This is a conversation, not a performance"],
  thrive:["Think in systems and care about foundations, not just outputs","Take ownership from concept through durable implementation","Want to build something that outlasts your tenure","Care genuinely about student mental health impact"],
  notfor:["Need highly defined requirements before starting","Optimize locally without considering long-term maintainability","See governance and documentation as overhead","Prefer isolated work over cross-team partnership"],
  success:[
    {period:"First 90 Days",desc:"Audit data systems, ship one small improvement, build key relationships, and propose 2-3 architecture priorities."},
    {period:"First 6 Months",desc:"Core analytical models well-designed and trusted. Metrics defined consistently. Self-service analytics enabling Product, Clinical, and Ops teams."},
    {period:"First 12 Months",desc:"Analytics shifted from reactive reporting to proactive enablement. Executive team uses data confidently. Recognized as the Director of Data's key thought partner on strategy."},
  ],
  mustHave:["8+ years in analytics, data, or a related technical role","Advanced SQL proficiency with complex, messy datasets","Experience designing analytical data models and defining metrics at scale","Experience with BigQuery, Snowflake, or Redshift","Systems-thinking mindset","Ownership mentality: concept through durable implementation"],
  niceToHave:["Healthcare, mental health, or EdTech domain experience","Early-stage or high-growth startup experience","Experimentation or causal analysis tools (Python, R)","Analytics engineering tooling (dbt, data governance)"],
  whatYoullDo:[
    {label:"Data Architecture",bullets:["Design and evolve core analytical data models","Establish standards for metrics, transformations, and semantic layers","Define best practices for analytics quality and long-term maintainability","Partner with data engineering and product to ensure foundations scale"]},
    {label:"Technical Leadership",bullets:["Serve as senior thought partner to the Director of Data","Provide architectural guidance across the data team","Set the bar for what great analytics work looks like at Cartwheel","Support evolution from ad-hoc analysis to productized solutions"]},
    {label:"Enablement",bullets:["Build and support self-service analytics and executive-ready reporting","Ensure new launches are instrumented with clear success metrics from Day 1","Improve measurement of outcomes: access to care, conversion, retention","Support experimentation across R&D, Marketing, and Operations"]},
    {label:"Governance",bullets:["Champion data quality through testing, monitoring, and governance","Ensure analytical workflows are reproducible, well-documented, and resilient","Contribute to data dictionaries, metric definitions, and shared documentation"]},
  ],
  aboutRole:"The Principal Data Analyst is a senior individual contributor responsible for shaping the analytics and data foundation at Cartwheel. This role emphasizes data system design, analytical architecture, and defining best practices for how data is modeled and delivered.\n\nYou will work as a staff-level technical leader on the data team — a close thought partner to the Director of Data — helping raise the bar for what good analytical work looks like.",
  compBenefits:"$170,000-$210,000 cash compensation plus competitive equity. Full benefits: PPO medical/vision/dental/orthodontia, paid parental leave (12 weeks), 401K with 2% employer match, generous PTO including Dec 25-Jan 1 closure, $500 learning stipend, MacBook, and annual in-person retreat.",
  stagePrepData:[
    {stage:"Recruiter Screen",prep:["Research Cartwheel's mission and school-based model","Prepare a concise background summary focused on data leadership","Know your comp expectations within the $170K-$210K range","Think about what draws you to mission-driven work"],questions:["What does success look like in the first 90 days?","How does the data team collaborate with Product and Clinical?","What is the biggest data challenge Cartwheel is working through?"]},
    {stage:"Hiring Manager",prep:["Prepare 1-2 analytics framework examples with full context","Walk through context, approach, tradeoffs, validation, and impact","This is not a deep technical test — clarity of thinking matters most","Think about how you have moved teams from ad-hoc to productized solutions"],questions:["What are the 2-3 most important things to accomplish in year one?","How do you see the analytics team evolving over the next 12-18 months?","What does great thought partnership look like day-to-day?"]},
    {stage:"Take-Home Exercise",prep:["Block 90 uninterrupted minutes — treat it like a real work session","Read all questions before starting so you can manage your time","Write clean SQL with comments to show your thinking","Lead the proposal with the metrics that matter most, and explain your reasoning"],questions:[]},
    {stage:"Case Study Review",prep:["Prepare a tight 3-minute take-home recap: problem, scope, approach","Walk through your SQL — be ready to discuss efficiency and alternatives","Be honest about gaps or assumptions — strong candidates own them","Think through what a Day 1 dashboard for a new service line would look like"],questions:["What does the current data quality monitoring process look like?","How does the team handle discrepancies between data sources?","What does the analytics tooling stack look like end-to-end?"]},
    {stage:"Business Acumen",prep:["Practice walking through a problem out loud — narrate your thinking","Prepare to ask clarifying questions before jumping to answers","Propose next steps and recommendations, not just diagnoses","This is collaborative, not adversarial — think of it as a working session"],questions:["What business problems is the data team most focused on?","How does data inform go-to-market or expansion decisions?","What does the relationship between data and clinical look like?"]},
    {stage:"Exec Review",prep:["Prepare your long-term vision for data at a company like Cartwheel","Have a thoughtful answer for where you want to be in 3 years","Know why Cartwheel specifically — mission alignment will come up","Prepare 2-3 questions that show strategic thinking"],questions:["How does the exec team use data today, and how would you like that to evolve?","What is Cartwheel's biggest strategic bet over the next 2 years?","How does data infrastructure factor into the growth roadmap?"]},
  ],
  checklist:[
    {stage:"Before Recruiter Screen",items:["Research Cartwheel's mission and school-based model","Prepare your background summary","Know your comp expectations","Review the job description"]},
    {stage:"Before HM Interview",items:["Prepare 2 analytics framework examples","Practice walking through tradeoffs out loud","Review Cartwheel's clinical model","Prepare 3-4 thoughtful questions for Jacob"]},
    {stage:"Before Take-Home",items:["Block 90 uninterrupted minutes","Re-read all questions before starting","Prepare a clean memo or slide deck template","Plan to submit within one week"]},
    {stage:"Before Case Study Review",items:["Prepare a 3-min take-home recap","Review your SQL for efficiency improvements","Think through your data integrity approach","Prepare dashboard design thinking"]},
    {stage:"Before Business Acumen",items:["Practice metric decomposition out loud","Prepare to ask clarifying questions","Review Cartwheel's business model","Think about how data enables go-to-market decisions"]},
    {stage:"Before Exec Review",items:["Prepare your long-term vision for data at Cartwheel","Sharpen your why Cartwheel answer","Prepare 2-3 strategic questions for Daniel","Reflect on what excites you most about the mission"]},
  ],
  interviewers:[
    {label:"Recruiter Screen",name:"Caroline Colpini",title:"Talent Acquisition",href:"https://www.linkedin.com/in/caroline-colpini-154b27b4/"},
    {label:"Hiring Manager",name:"Jacob Savos",title:"Director of Data",href:"https://www.linkedin.com/in/jacob-savos/"},
    {label:"Take-Home Exercise",name:"",title:"",href:null},
    {label:"Case Study Review",name:"Nicholas Franchetti",title:"",href:"https://www.linkedin.com/in/nfranchetti/"},
    {label:"Business Acumen",name:"Sam Blumpkin + Sam Bilow",title:"",href:null,hrefs:["https://www.linkedin.com/in/samblumkin/","https://www.linkedin.com/in/sam-bilow-59434150/"]},
    {label:"Exec Review",name:"Daniel Ilkovich",title:"CTO",href:"https://www.linkedin.com/in/ilkovich/"},
  ],
  links:{cartwheel:"https://www.cartwheel.org",wallOfLove:"https://www.cartwheel.org/wall-of-love",glassdoor:"https://www.glassdoor.com/Overview/Working-at-Cartwheel-MA-EI_IE9563214.11,23.htm",linkedin:"https://www.linkedin.com/company/cartwheelcare/posts/?feedView=all"},
};

const SPM_ROLE = {
  title:"Senior Product Manager, AI Products", slug:"senior-product-manager-ai",
  department:"R&D", reportsto:"Sarah Turrin, Chief Product Officer",
  location:"Boston or Chicago preferred, Remote-friendly", employment:"Full-Time, W2", comp:"$120,000 - $170,000",
  mission:"Build the AI-enabled tools that transform how schools and clinicians deliver mental health care — turning messy, real-world workflows into software that actually works for the people using it.",
  stats:[{n:"350+",label:"School Districts",sub:"Serving 2.5% of U.S. districts"},{n:"$20M",label:"in ARR",sub:"Achieved in just 3 years"},{n:"300%",label:"YoY Growth",sub:"Capital-efficient scale"},{n:"1.5M",label:"Students",sub:"Enrolled across districts"}],
  team:["Sarah Turrin — CPO (your hiring manager)","Product Design (workflow design, prototyping)","Engineering (system behaviors, edge cases, scalability)","School staff and end users (direct user research)","Executive leadership (product direction and tradeoffs)"],
  stages:[
    {stage:"Recruiter Screen",time:"30m",who:"Caroline Colpini",focus:"Role fit, values, compensation"},
    {stage:"Product Judgment",time:"60m",who:"Sarah Turrin, CPO",focus:"Ambiguous problem-solving, 0-to-1 ownership, AI product perspective"},
    {stage:"Technical Design",time:"60m",who:"Danielle Hawthorne, Henry Lyford, Sandip Subedi",focus:"Workflow translation, cross-functional tradeoffs, AI trust and safety"},
    {stage:"User-Centered Discovery",time:"60m",who:"Julie Jungman, Allie Pashi, Sarah Shoff, GG Guitart, Rebecca Rae Allen",focus:"User research approach, synthesizing feedback, building trust with users"},
    {stage:"Live Product Case",time:"60m",who:"Sarah Turrin, Daniel Ilkovich, Dan Tartakovsky, Sam Bilow",focus:"Problem framing, MVP definition, structured reasoning under ambiguity"},
    {stage:"Executive Review",time:"30m",who:"Joe English, CEO",focus:"Mission alignment, growth mindset, long-term values fit"},
  ],
  contacts:["Recruiter: Caroline Colpini - caroline.colpini@cartwheelcare.org","Coordinator: Avery Henry - avery.henry@cartwheelcare.org"],
  prep:["Bring 1-2 examples of products you have personally owned end-to-end","Focus on how you think, not just what shipped — tradeoffs, decisions, learnings","Be honest about the limits of AI in your work — we value that perspective","This is a working session, not a test"],
  thrive:["Enjoy ambiguity and shaping problems from scratch","Are comfortable balancing speed, quality, and scalability","Like spending time with real users in real environments","Build and use AI tools as part of your everyday workflow"],
  notfor:["Require highly defined requirements or rigid processes","Avoid direct customer interaction or rely on secondhand insights","Add heavyweight process instead of enabling fast learning","Over-index on strategy decks without shipping or validating quickly"],
  success:[
    {period:"First 90 Days",desc:"Deeply understand school and care team workflows; conduct in-person user research; define problem statements and MVP scopes; ship at least one validated prototype."},
    {period:"First 6 Months",desc:"Launch initial AI-enabled product capability with active customer usage; establish clear success metrics; iterate based on qualitative and quantitative feedback."},
    {period:"First 12 Months",desc:"Own a portfolio of 0-to-1 initiatives with sustained adoption; demonstrate measurable workflow efficiency gains; help establish lightweight product practices across the org."},
  ],
  mustHave:["7+ years of Product Management experience with clear 0-to-1 ownership","Demonstrated experience building or prototyping AI-enabled products","Comfort with workflow-heavy, operational tools (healthcare, education, GovTech)","Strong product judgment under ambiguity and incomplete data","Proven ability to work directly with customers and conduct user research","Ability to operate as a senior IC who influences direction"],
  niceToHave:["Experience with AI-native patterns (copilots, workflow automation, decision support)","Background in regulated domains (healthcare, education)","Familiarity with low-code or no-code tools","Experience building internal tools that later became customer-facing","Startup or early-stage company experience"],
  whatYoullDo:[
    {label:"0-to-1 AI Product Development",bullets:["Lead development of new AI-enabled SaaS tools from early concept through initial adoption","Partner with Design and Engineering to shape workflows, MVPs, and system behaviors","Use AI prototyping tools to accelerate discovery, experimentation, and iteration","Make pragmatic tradeoffs between speed, quality, and scalability"]},
    {label:"Workflow Translation",bullets:["Spend time directly with school staff to understand real-world workflows","Translate messy, real-world problems into clear product abstractions","Design products focused on workflow automation and decision-support","Build products that balance speed with safety, trust, and usability"]},
    {label:"Discovery and Iteration",bullets:["Define success metrics and use qualitative and quantitative feedback to guide iteration","Conduct sustained, in-person user research with school staff and care teams","Navigate conflicting signals between what users say vs. do","Know when you have learned enough to move forward"]},
    {label:"Org Contribution",bullets:["Help establish lightweight product practices that enable fast learning","Collaborate with GTM teams on marketing and how product lands in market","Operate as a senior IC who shapes direction and raises the bar"]},
  ],
  aboutRole:"Cartwheel is building technology that supports how mental health care is delivered and coordinated in school settings. We are looking for a Senior Product Manager, AI Products to lead early-stage product initiatives focused on improving how complex work gets done.\n\nThis is a senior individual contributor role for someone who thrives in ambiguity, partners closely with customers, and enjoys shaping products from the earliest stages.",
  compBenefits:"$120,000-$170,000 base compensation plus meaningful equity. Level and comp may flex for exceptional candidates. Full benefits: PPO medical/vision/dental, paid parental leave, 401K with employer match, generous PTO, $500 learning stipend, MacBook, and annual in-person retreat.",
  stagePrepData:[
    {stage:"Recruiter Screen",prep:["Research Cartwheel's mission and school-based model","Prepare your background summary focused on 0-to-1 product work","Know your comp expectations within the $120K-$170K range","Think about why AI and mental health and education draws you in"],questions:["What does success look like in the first 90 days?","How does the PM team collaborate with Engineering and Design?","What AI initiatives is Cartwheel most focused on right now?"]},
    {stage:"Product Judgment",prep:["Prepare 1-2 examples of products you have personally owned end-to-end","Focus on how you think, not just what shipped","Be ready to discuss your honest perspective on AI's real-world usefulness and limits","Think out loud, ask questions, collaborate — this is a working session"],questions:["What is the most important problem to solve in year one?","How does Cartwheel think about AI safety and trust in product?","What does the product development process look like today?"]},
    {stage:"Technical Design",prep:["Prepare examples of how you have handled cross-functional tension","Practice translating a messy workflow into a product concept out loud","Think through how you would handle an AI edge case involving student data","There may be a lightweight live exercise — focus on clarity over perfection"],questions:["How do Engineering and Design collaborate on early-stage initiatives?","What is the biggest technical constraint on AI product development right now?","How do you handle edge cases in workflows involving sensitive student data?"]},
    {stage:"User-Centered Discovery",prep:["Prepare 2 examples where user research changed your direction","Think through your approach to building trust with overwhelmed users","Review Cartwheel's school and clinical user types","Prepare questions about the current user research process"],questions:["How do school staff currently experience the Cartwheel product?","What is the hardest user research challenge in school-based mental health?","How do care teams and school staff interact differently with the product?"]},
    {stage:"Live Product Case",prep:["No slides needed — practice structured thinking out loud","Focus on framing the problem, identifying constraints, defining a reasonable MVP","Practice staying calm and collaborative when working through ambiguity","Prepare 1-2 clarifying questions to ask before diving in"],questions:["What is the most important constraint I should keep in mind?","How would you want this type of thinking applied on the job?"]},
    {stage:"Executive Review",prep:["Prepare your why Cartwheel answer — mission alignment will be central","Have a thoughtful answer for how you reflect on mistakes and growth","Prepare 2-3 strategic questions about where Cartwheel is headed","This is a two-way conversation — Joe expects you to interview him too"],questions:["What is the biggest strategic bet Cartwheel is making over the next 2 years?","How do you think about AI's role in Cartwheel's long-term competitive position?","What does the culture look like as the company scales past 200 people?"]},
  ],
  checklist:[
    {stage:"Before Recruiter Screen",items:["Research Cartwheel's mission and school-based model","Prepare your background summary","Know your comp expectations","Review the job description"]},
    {stage:"Before Product Judgment Round",items:["Prepare 2 end-to-end product examples","Articulate the tradeoffs you made and what you learned","Prepare your honest perspective on AI's real-world usefulness","Review Cartwheel's product and clinical model"]},
    {stage:"Before Technical Design Round",items:["Prepare cross-functional collaboration examples","Practice translating a messy workflow into a product concept out loud","Think through how you would handle an AI edge case involving student data","Prepare for a possible lightweight live exercise"]},
    {stage:"Before User-Centered Discovery",items:["Prepare 2 examples where user research changed your direction","Think through your approach to building trust with overwhelmed users","Review Cartwheel's school and clinical user types","Prepare questions about the current user research process"]},
    {stage:"Before Live Product Case",items:["No slides needed — practice structured thinking out loud","Review basic product framing: problem, constraints, MVP, metrics","Practice staying calm and collaborative under ambiguity","Prepare 1-2 clarifying questions to ask before diving in"]},
    {stage:"Before Executive Review",items:["Sharpen your why Cartwheel answer","Prepare how you reflect on a past mistake and what you learned","Prepare 2-3 strategic questions for Joe","Reflect on your long-term motivations and values alignment"]},
  ],
  interviewers:[
    {label:"Recruiter Screen",name:"Caroline Colpini",title:"Talent Acquisition",href:"https://www.linkedin.com/in/caroline-colpini-154b27b4/"},
    {label:"Product Judgment",name:"Sarah Turrin",title:"CPO",href:"https://www.linkedin.com/in/sarahturrin/"},
    {label:"Technical Design",name:"",title:"",href:null,multiHrefs:[
      {name:"Danielle Hawthorne",href:"https://www.linkedin.com/in/daniellemhawthorne/"},
      {name:"Henry Lyford",href:"https://www.linkedin.com/in/hlyford/"},
      {name:"Sandip Subedi",href:"https://www.linkedin.com/in/sandipsubedi/"},
    ]},
    {label:"User-Centered Discovery",name:"",title:"",href:null,multiHrefs:[
      {name:"Julie Jungman",href:"https://www.linkedin.com/in/julie-jungman-lcsw/"},
      {name:"Allie Pashi",href:"https://www.linkedin.com/in/allie-pashi/"},
      {name:"Sarah Shoff",href:"https://www.linkedin.com/in/sarah-shoff-she-her-1330a54/"},
      {name:"GG Guitart",href:"https://www.linkedin.com/in/gg-guitart/"},
      {name:"Rebecca Rae Allen",href:"https://www.linkedin.com/in/rebecca-rae-allen/"},
    ]},
    {label:"Live Product Case",name:"",title:"",href:null,multiHrefs:[
      {name:"Sarah Turrin",href:"https://www.linkedin.com/in/sarahturrin/"},
      {name:"Daniel Ilkovich",href:"https://www.linkedin.com/in/ilkovich/"},
      {name:"Dan Tartakovsky",href:"https://www.linkedin.com/in/tartakovsky/"},
      {name:"Sam Bilow",href:"https://www.linkedin.com/in/sam-bilow-59434150/"},
    ]},
    {label:"Executive Review",name:"Joe English",title:"CEO",href:"https://www.linkedin.com/in/joe-m-english/"},
  ],
  links:{cartwheel:"https://www.cartwheel.org",wallOfLove:"https://www.cartwheel.org/wall-of-love",glassdoor:"https://www.glassdoor.com/Overview/Working-at-Cartwheel-MA-EI_IE9563214.11,23.htm",linkedin:"https://www.linkedin.com/company/cartwheelcare/posts/?feedView=all"},
};

const BUILT_IN_ROLES = [PDA_ROLE, SPM_ROLE];

// ── Shared Components ─────────────────────────────────────────
function ExtLink({href,children,style={}}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{color:C.indigo,textDecoration:"none",fontWeight:600,borderBottom:`1px solid ${C.lightLavender}`,paddingBottom:1,...style}}>
      {children}
    </a>
  );
}

function InterviewerDisplay({interviewer}) {
  if(!interviewer) return null;
  if(interviewer.multiHrefs) return (
    <span>{interviewer.multiHrefs.map((m,j)=>(
      <span key={j}>{j>0?", ":""}<ExtLink href={m.href}>{m.name}</ExtLink></span>
    ))}</span>
  );
  if(interviewer.hrefs) return (
    <><ExtLink href={interviewer.hrefs[0]}>Sam Blumpkin</ExtLink> + <ExtLink href={interviewer.hrefs[1]}>Sam Bilow</ExtLink></>
  );
  return interviewer.href ? <ExtLink href={interviewer.href}>{interviewer.name}</ExtLink> : <span style={{color:C.taupe,fontStyle:"italic"}}>—</span>;
}

// ── Animated entry wrapper ────────────────────────────────────
function FadeIn({children, delay=0, style={}}) {
  return (
    <div style={{
      animation:`fadeUp 0.5s ease both`,
      animationDelay:`${delay}ms`,
      ...style
    }}>
      {children}
    </div>
  );
}

// ── Accordion ─────────────────────────────────────────────────
function Accordion({q, children, defaultOpen=false}) {
  const [open,setOpen] = useState(defaultOpen);
  return (
    <div style={{
      border:`1px solid ${open?"rgba(57,75,153,0.3)":"rgba(15,27,31,0.08)"}`,
      borderRadius:12,
      background:open?"rgba(57,75,153,0.02)":C.white,
      overflow:"hidden",
      transition:"all 0.25s ease",
      boxShadow:open?"0 4px 20px rgba(57,75,153,0.08)":"0 1px 3px rgba(15,27,31,0.04)",
    }}>
      <button onClick={()=>setOpen(!open)} style={{
        width:"100%",padding:"15px 18px",background:"none",border:"none",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        cursor:"pointer",textAlign:"left",gap:14,
      }}>
        <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:600,fontSize:14,color:C.charcoal,lineHeight:1.4}}>{q}</span>
        <div style={{
          width:28,height:28,borderRadius:"50%",
          background:open?C.indigo:"rgba(57,75,153,0.08)",
          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
          transition:"all 0.2s ease",
        }}>
          <ChevronDown size={14} color={open?C.white:C.indigo} style={{transform:open?"rotate(180deg)":"none",transition:"transform 0.2s ease"}}/>
        </div>
      </button>
      <div style={{
        maxHeight:open?"800px":"0",overflow:"hidden",
        transition:"max-height 0.35s ease",
      }}>
        <div style={{padding:"4px 18px 18px",borderTop:"1px solid rgba(57,75,153,0.08)"}}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────
function SectionLabel({children, light=false}) {
  return (
    <div style={{
      fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:11,
      letterSpacing:"1.5px",textTransform:"uppercase",
      color:light?"rgba(255,255,255,0.4)":C.taupe,
      marginBottom:12,
    }}>
      {children}
    </div>
  );
}

function SectionHead({children, light=false}) {
  return (
    <div style={{marginBottom:20}}>
      <h2 style={{
        fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:20,
        color:light?C.white:C.charcoal,margin:"0 0 10px",letterSpacing:"-0.3px",
      }}>{children}</h2>
      <div style={{height:1,background:light?"rgba(255,255,255,0.1)":"rgba(15,27,31,0.07)"}}/>
    </div>
  );
}

// ── Checklist ─────────────────────────────────────────────────
function PrepChecklist({role}) {
  const [checked,setChecked]=useState({});
  const [openStage,setOpenStage]=useState(0);
  const toggle=(si,ii)=>{const k=`${si}-${ii}`;setChecked(p=>({...p,[k]:!p[k]}));};
  const progress=(si)=>{const items=(role.checklist||[])[si]?.items||[];return{done:items.filter((_,i)=>checked[`${si}-${i}`]).length,total:items.length};};
  const totalDone=Object.values(checked).filter(Boolean).length;
  const totalItems=(role.checklist||[]).reduce((a,s)=>a+(s.items?.length||0),0);
  const pct=totalItems?Math.round((totalDone/totalItems)*100):0;

  return (
    <div>
      {/* Progress bar */}
      <div style={{
        background:C.charcoal,borderRadius:16,padding:"20px 24px",
        marginBottom:20,display:"flex",alignItems:"center",gap:20,
      }}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:13,color:C.white,marginBottom:8}}>
            Your preparation progress
          </div>
          <div style={{background:"rgba(255,255,255,0.1)",borderRadius:99,height:6,overflow:"hidden"}}>
            <div style={{
              height:"100%",background:`linear-gradient(90deg, ${C.lavender}, ${C.indigo})`,
              borderRadius:99,width:`${pct}%`,transition:"width 0.5s ease",
            }}/>
          </div>
        </div>
        <div style={{
          fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:28,
          color:pct===100?C.mint:C.lavender,minWidth:56,textAlign:"right",
          transition:"color 0.3s",
        }}>{pct}%</div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {(role.checklist||[]).map((section,si)=>{
          const{done,total}=progress(si);const isOpen=openStage===si;const complete=done===total;
          return (
            <div key={si} style={{
              border:`1px solid ${isOpen?"rgba(57,75,153,0.25)":complete?"rgba(38,84,79,0.2)":"rgba(15,27,31,0.08)"}`,
              borderRadius:12,overflow:"hidden",
              background:complete?"rgba(38,84,79,0.04)":C.white,
              transition:"all 0.2s ease",
              boxShadow:isOpen?"0 4px 16px rgba(57,75,153,0.08)":"none",
            }}>
              <button onClick={()=>setOpenStage(isOpen?null:si)} style={{
                width:"100%",padding:"14px 18px",background:"none",border:"none",
                display:"flex",justifyContent:"space-between",alignItems:"center",
                cursor:"pointer",textAlign:"left",gap:12,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{
                    width:28,height:28,borderRadius:"50%",flexShrink:0,
                    background:complete?C.forest:isOpen?C.indigo:"rgba(57,75,153,0.1)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    transition:"all 0.2s ease",
                  }}>
                    {complete
                      ? <Check size={14} color={C.white}/>
                      : <span style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,fontWeight:700,color:isOpen?C.white:C.indigo}}>{si+1}</span>
                    }
                  </div>
                  <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:600,fontSize:14,color:complete?C.forest:C.charcoal}}>{section.stage}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:12,color:C.taupe,fontWeight:500}}>{done}/{total}</span>
                  <ChevronDown size={14} color={C.indigo} style={{transform:isOpen?"rotate(180deg)":"none",transition:"0.2s"}}/>
                </div>
              </button>
              {isOpen&&(
                <div style={{padding:"4px 18px 16px",borderTop:"1px solid rgba(57,75,153,0.08)"}}>
                  {(section.items||[]).map((item,ii)=>{
                    const k=`${si}-${ii}`;const isChecked=!!checked[k];
                    return (
                      <div key={ii} onClick={()=>toggle(si,ii)} style={{
                        display:"flex",gap:14,alignItems:"flex-start",
                        padding:"10px 0",cursor:"pointer",
                        borderBottom:ii<(section.items.length-1)?"1px solid rgba(15,27,31,0.05)":"none",
                      }}>
                        <div style={{
                          width:20,height:20,borderRadius:6,flexShrink:0,marginTop:1,
                          border:`2px solid ${isChecked?C.forest:"rgba(15,27,31,0.2)"}`,
                          background:isChecked?C.forest:"transparent",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          transition:"all 0.15s ease",
                        }}>
                          {isChecked&&<Check size={11} color={C.white}/>}
                        </div>
                        <span style={{
                          fontSize:14,color:isChecked?C.taupe:C.charcoal,
                          lineHeight:1.5,textDecoration:isChecked?"line-through":"none",
                          transition:"all 0.15s ease",
                        }}>{item}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Stage Prep ────────────────────────────────────────────────
function StagePrep({role}) {
  const [open,setOpen]=useState(null);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {(role.stages||[]).map((stage,i)=>{
        const pd=(role.stagePrepData||[])[i]||{prep:[],questions:[]};
        const interviewer=(role.interviewers||[])[i];
        const isOpen=open===i;
        const isTakeHome=stage.stage==="Take-Home Exercise";
        return (
          <div key={i} style={{
            border:`1px solid ${isOpen?"rgba(57,75,153,0.25)":"rgba(15,27,31,0.08)"}`,
            borderRadius:12,overflow:"hidden",
            background:isOpen?"rgba(57,75,153,0.02)":C.white,
            transition:"all 0.25s ease",
            boxShadow:isOpen?"0 4px 20px rgba(57,75,153,0.08)":"0 1px 3px rgba(15,27,31,0.04)",
          }}>
            <button onClick={()=>setOpen(isOpen?null:i)} style={{
              width:"100%",padding:"16px 18px",background:"none",border:"none",
              display:"flex",justifyContent:"space-between",alignItems:"center",
              cursor:"pointer",textAlign:"left",gap:14,
            }}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{
                  background:isOpen?C.indigo:"rgba(57,75,153,0.08)",
                  borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,
                  fontFamily:"'Montserrat',sans-serif",
                  color:isOpen?C.white:C.indigo,whiteSpace:"nowrap",transition:"all 0.2s",
                }}>{stage.time}</div>
                <div>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:14,color:C.charcoal}}>{stage.stage}</div>
                  <div style={{fontSize:12,color:C.taupe,marginTop:2}}>
                    {interviewer&&interviewer.name ? <InterviewerDisplay interviewer={interviewer}/> : <span style={{color:C.taupe,fontStyle:"italic"}}>Self-directed</span>}
                  </div>
                </div>
              </div>
              <ChevronDown size={16} color={C.indigo} style={{flexShrink:0,transform:isOpen?"rotate(180deg)":"none",transition:"0.2s"}}/>
            </button>
            {isOpen&&(
              <div style={{padding:"0 18px 20px",borderTop:"1px solid rgba(57,75,153,0.08)"}}>
                <div style={{
                  display:"grid",
                  gridTemplateColumns:isTakeHome?"1fr":"1fr 1fr",
                  gap:16,marginTop:16,
                }}>
                  <div>
                    <SectionLabel>How to prepare</SectionLabel>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {pd.prep.map((tip,j)=>(
                        <div key={j} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                          <div style={{width:5,height:5,borderRadius:"50%",background:C.lavender,flexShrink:0,marginTop:7}}/>
                          <span style={{fontSize:13,color:"#4a5568",lineHeight:1.6}}>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {!isTakeHome&&pd.questions.length>0&&(
                    <div style={{background:"rgba(240,236,233,0.6)",borderRadius:10,padding:"16px"}}>
                      <SectionLabel>Questions to ask</SectionLabel>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {pd.questions.map((q,j)=>(
                          <div key={j} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                            <MessageCircle size={12} color={C.forest} style={{flexShrink:0,marginTop:3}}/>
                            <span style={{fontSize:13,color:C.charcoal,lineHeight:1.55,fontStyle:"italic"}}>"{q}"</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Mission Dropdown ──────────────────────────────────────────
function MissionDropdown() {
  return (
    <Accordion q="What is Cartwheel's mission?">
      <p style={{fontSize:14,color:"#4a5568",lineHeight:1.75,margin:"12px 0 16px"}}>
        Cartwheel partners with K-12 schools to provide accessible mental health care to students — enabling earlier intervention, higher engagement, and better-coordinated care. Instead of going around school staff, we work alongside them.
      </p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
        {[["58%","of students achieve full remission of anxiety"],["3x","reduction in moderate-to-severe depression"],["92%","of families would recommend us to a peer"]].map(([n,label])=>(
          <div key={n} style={{background:`linear-gradient(135deg, ${C.lightLavender}, #ddd8fb)`,borderRadius:10,padding:"14px 16px",border:"1px solid rgba(177,165,247,0.3)"}}>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:22,color:C.indigo}}>{n}</div>
            <div style={{fontSize:11,color:C.indigo,marginTop:4,lineHeight:1.4,opacity:0.75}}>{label}</div>
          </div>
        ))}
      </div>
    </Accordion>
  );
}

// ══════════════════════════════════════════════════════════════
// CANDIDATE VIEW
// ══════════════════════════════════════════════════════════════
function CandidateView({role,onBack}) {
  const [tab,setTab]=useState("guide");
  const [msgs,setMsgs]=useState([{role:"assistant",content:`Hi. I'm here to help you prepare for your ${role.title} interview at Cartwheel.\n\nAsk me anything about the process, the team, or what to expect. I'll give you honest, specific answers — not hype.`}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading]);

  const CHAT_SYSTEM=`You are a calm, honest, and helpful interview preparation assistant for Cartwheel — a K-12 mental health telehealth company. You are helping a candidate prepare for their ${role.title} interview.

Tone: calm, human, reassuring but honest. Never hypey. Don't say things like "you'll crush it" or "amazing opportunity." Be specific and practical.

ROLE: ${role.title} | Reports to ${role.reportsto} | ${role.location} | ${role.comp}
STAGES: ${(role.stages||[]).map(s=>`${s.stage} (${s.time}): ${s.focus}`).join("; ")}
CONTACTS: ${(role.contacts||[]).join("; ")}
PREP: ${(role.prep||[]).join("; ")}

COMPANY: Series B, Menlo/Reach/General Catalyst. Largest K-12 mental health telehealth provider in US. 58% full remission; 3x depression reduction; 92% families recommend.
BENEFITS: PPO medical/vision/dental, paid parental leave, 401K+2% match, $500 stipend, MacBook, equity, remote + annual retreat.

Only answer from this information. If unsure, direct to the coordinator listed in contacts.`;

  const send=async(text)=>{
    const q=(text||input).trim();if(!q)return;
    setInput("");
    const updated=[...msgs,{role:"user",content:q}];
    setMsgs(updated);setLoading(true);
    try{
      const reply=await callClaude(CHAT_SYSTEM,updated.slice(1).map(m=>({role:m.role,content:m.content})),800);
      setMsgs(p=>[...p,{role:"assistant",content:reply||"Something went wrong. Please reach out to your coordinator directly."}]);
    }catch{
      setMsgs(p=>[...p,{role:"assistant",content:"Something went wrong. Please reach out to your coordinator directly."}]);
    }
    setLoading(false);
  };

  const TABS=[
    {id:"guide",label:"Overview",icon:<BookOpen size={14}/>},
    {id:"chat",label:"Ask",icon:<MessageCircle size={14}/>},
    {id:"roadmap",label:"Roadmap",icon:<Map size={14}/>},
    {id:"culture",label:"Life at Cartwheel",icon:<Heart size={14}/>},
    {id:"checklist",label:"Checklist",icon:<CheckSquare size={14}/>},
    {id:"jd",label:"Job Description",icon:<FileText size={14}/>},
  ];

  const links=role.links||{};

  return (
    <div style={{fontFamily:"'Inter',sans-serif",minHeight:"100vh",background:C.sand,color:C.charcoal}}>

      {/* Header */}
      <div style={{
        background:C.white,
        borderBottom:"1px solid rgba(15,27,31,0.07)",
        padding:"14px 28px",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        position:"sticky",top:0,zIndex:50,
        backdropFilter:"blur(8px)",
      }}>
        <Wordmark/>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:12,color:C.taupe,fontStyle:"italic",display:"none"}}>Candidate Information Packet</div>
          {onBack&&(
            <button onClick={onBack} style={{
              fontSize:11,color:C.taupe,background:"transparent",
              border:"1px solid rgba(15,27,31,0.12)",borderRadius:8,
              padding:"5px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:6,
              fontFamily:"'Montserrat',sans-serif",fontWeight:600,
              transition:"all 0.15s",
            }}>
              <Lock size={10}/> Admin
            </button>
          )}
        </div>
      </div>

      {/* Hero — dark panel */}
      <div style={{
        background:`linear-gradient(145deg, #2d3d7a 0%, ${C.indigo} 40%, #4a5daa 100%)`,
        padding:"48px 28px 0",
        position:"relative",overflow:"hidden",
      }}>
        {/* Decorative background circle */}
        <div style={{
          position:"absolute",right:-80,top:-80,width:400,height:400,
          borderRadius:"50%",background:"rgba(57,75,153,0.08)",pointerEvents:"none",
        }}/>
        <div style={{
          position:"absolute",left:-60,bottom:0,width:300,height:300,
          borderRadius:"50%",background:"rgba(177,165,247,0.05)",pointerEvents:"none",
        }}/>

        <div style={{maxWidth:820,margin:"0 auto",position:"relative"}}>
          <FadeIn delay={0}>
            <div style={{
              display:"inline-flex",alignItems:"center",gap:8,
              background:"rgba(177,165,247,0.12)",borderRadius:99,
              padding:"5px 12px",marginBottom:16,
              border:"1px solid rgba(177,165,247,0.2)",
            }}>
              <div style={{width:6,height:6,borderRadius:"50%",background:C.mint,animation:"pulse 2s infinite"}}/>
              <span style={{fontSize:11,fontWeight:600,color:C.lavender,fontFamily:"'Montserrat',sans-serif",letterSpacing:"0.5px"}}>{role.department} · {role.location}</span>
            </div>
          </FadeIn>

          <FadeIn delay={80}>
            <h1 style={{
              fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:32,
              color:C.white,margin:"0 0 8px",letterSpacing:"-0.5px",lineHeight:1.2,
            }}>{role.title}</h1>
          </FadeIn>

          <FadeIn delay={140}>
            <p style={{fontSize:15,color:"rgba(255,255,255,0.55)",margin:"0 0 6px"}}>
              Reports to <span style={{color:"rgba(255,255,255,0.8)",fontWeight:500}}>{role.reportsto}</span>
            </p>
            <p style={{fontSize:15,color:"rgba(255,255,255,0.55)",margin:"0 0 28px"}}>
              <span style={{color:C.mint,fontWeight:600}}>{role.comp}</span> + equity
            </p>
          </FadeIn>

          <FadeIn delay={200}>
            <p style={{
              fontSize:14,color:"rgba(255,255,255,0.6)",lineHeight:1.75,
              maxWidth:560,margin:"0 0 32px",
              borderLeft:`3px solid ${C.lavender}`,paddingLeft:16,
            }}>
              {role.mission}
            </p>
          </FadeIn>

          {/* Stats */}
          <FadeIn delay={260}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:"rgba(255,255,255,0.06)",borderRadius:14,overflow:"hidden",marginBottom:0}}>
              {(role.stats||[]).map(({n,label,sub},i)=>(
                <div key={n} style={{
                  padding:"20px 16px",
                  background:i===0?"rgba(57,75,153,0.15)":"transparent",
                  borderRight:i<3?"1px solid rgba(255,255,255,0.06)":"none",
                }}>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:24,color:C.white,lineHeight:1}}>{n}</div>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:600,fontSize:11,color:C.lavender,marginTop:5,letterSpacing:"0.3px"}}>{label}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:3,lineHeight:1.4}}>{sub}</div>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* Tabs */}
          <div style={{
            display:"flex",gap:2,marginTop:28,
            borderBottom:"1px solid rgba(255,255,255,0.08)",
            overflowX:"auto",
          }}>
            {TABS.map(({id,label,icon})=>(
              <button key={id} onClick={()=>setTab(id)} style={{
                padding:"11px 16px",border:"none",background:"none",cursor:"pointer",
                whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6,
                fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,
                color:tab===id?C.white:"rgba(255,255,255,0.35)",
                borderBottom:tab===id?`2px solid ${C.lavender}`:"2px solid transparent",
                transition:"all 0.15s",
                opacity:tab===id?1:0.7,
              }}>
                <span style={{opacity:tab===id?1:0.6}}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{maxWidth:820,margin:"0 auto",padding:"32px 28px 64px"}}>

        {/* ── OVERVIEW ── */}
        {tab==="guide"&&(
          <div style={{display:"flex",flexDirection:"column",gap:24}}>

            {/* Qualities + Contacts */}
            <FadeIn delay={0}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                <div style={{
                  background:C.charcoal,borderRadius:16,padding:"24px",
                  boxShadow:"0 4px 24px rgba(15,27,31,0.12)",
                }}>
                  <SectionLabel light>What we look for</SectionLabel>
                  {[
                    {icon:<Users size={14}/>,label:"Human",desc:"Warmth and compassion in how you work"},
                    {icon:<BookOpen size={14}/>,label:"Humble",desc:"Preferring learning to being right"},
                    {icon:<Check size={14}/>,label:"Accountable",desc:"Owning mistakes and delivering"},
                    {icon:<Star size={14}/>,label:"Innovative",desc:"Pushing for improvement"},
                    {icon:<Heart size={14}/>,label:"Resilient",desc:"Supporting each other through challenges"},
                  ].map(({icon,label,desc})=>(
                    <div key={label} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:14}}>
                      <div style={{color:C.lavender,marginTop:1,flexShrink:0}}>{icon}</div>
                      <div>
                        <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:13,color:C.white}}>{label} </span>
                        <span style={{fontSize:13,color:"rgba(255,255,255,0.45)",lineHeight:1.5}}>{desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{
                  background:C.white,borderRadius:16,padding:"24px",
                  border:"1px solid rgba(15,27,31,0.07)",
                  boxShadow:"0 2px 8px rgba(15,27,31,0.05)",
                }}>
                  <SectionLabel>Your contacts</SectionLabel>
                  {[
                    {label:"Recruiter",name:"Caroline Colpini",href:"mailto:caroline.colpini@cartwheelcare.org"},
                    {label:"Coordinator",name:"Avery Henry",href:"mailto:avery.henry@cartwheelcare.org"},
                    ...(role.contacts?.find(c=>c.includes("Take-home"))
                      ? [{label:"Take-home Qs",name:"Jacob Savos",href:"mailto:jacob.savos@cartwheelcare.org"}]
                      : []),
                  ].map(({label,name,href})=>(
                    <div key={label} style={{marginBottom:14}}>
                      <div style={{fontSize:11,fontWeight:600,color:C.taupe,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:3}}>{label}</div>
                      <a href={href} style={{fontSize:14,color:C.indigo,textDecoration:"none",fontWeight:600}}>{name}</a>
                    </div>
                  ))}
                  <div style={{marginTop:16,paddingTop:16,borderTop:"1px solid rgba(15,27,31,0.06)"}}>
                    <div style={{fontSize:12,color:C.taupe,lineHeight:1.6}}>Questions at any stage? Reach out to your coordinator — we want this process to feel clear.</div>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* FAQ sections */}
            {[
              {title:"The Interview Process",items:[
                {q:"How many rounds are there?",content:<p style={{fontSize:14,color:"#4a5568",lineHeight:1.75,margin:"12px 0 0"}}>{(role.stages||[]).length} stages: {(role.stages||[]).map(s=>s.stage).join(" → ")}. Not every candidate moves through every stage — we will always share next steps clearly after each conversation.</p>},
                {q:"How long does the process take?",content:<p style={{fontSize:14,color:"#4a5568",lineHeight:1.75,margin:"12px 0 0"}}>We move as quickly as mutual fit and scheduling allow. If you have a competing offer or timeline to flag, let your recruiter know — we will always try to work with you.</p>},
              ]},
              {title:"Who You'll Meet",items:[
                {q:"Who are my interviewers?",content:(
                  <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8}}>
                    {(role.interviewers||[]).map((p,i)=>(
                      <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                        <div style={{width:5,height:5,borderRadius:"50%",background:C.lavender,flexShrink:0,marginTop:7}}/>
                        <span style={{fontSize:14,color:"#4a5568",lineHeight:1.6}}>
                          <span style={{fontWeight:600,color:C.charcoal}}>{p.label}:</span>{" "}
                          {p.multiHrefs
                            ? p.multiHrefs.map((m,j)=><span key={j}>{j>0?", ":""}<ExtLink href={m.href}>{m.name}</ExtLink></span>)
                            : p.hrefs
                              ? <><ExtLink href={p.hrefs[0]}>Sam Blumpkin</ExtLink> + <ExtLink href={p.hrefs[1]}>Sam Bilow</ExtLink></>
                              : p.href ? <ExtLink href={p.href}>{p.name}</ExtLink> : <span style={{color:C.taupe,fontStyle:"italic"}}>Self-directed</span>
                          }
                          {p.title?`, ${p.title}`:""}
                        </span>
                      </div>
                    ))}
                  </div>
                )},
              ]},
              {title:"The Role",items:[
                {q:"What is the compensation?",content:<p style={{fontSize:14,color:"#4a5568",lineHeight:1.75,margin:"12px 0 0"}}>{role.comp} plus competitive equity. You will discuss where you see yourself in that range during your recruiter screen.</p>},
                {q:"What does success look like?",content:(
                  <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8}}>
                    {(role.success||[]).map(({period,desc})=>(
                      <div key={period} style={{background:"rgba(240,236,233,0.6)",borderRadius:10,padding:"14px 16px"}}>
                        <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,color:C.forest,marginBottom:5}}>{period}</div>
                        <div style={{fontSize:13,color:"#4a5568",lineHeight:1.65}}>{desc}</div>
                      </div>
                    ))}
                  </div>
                )},
              ]},
              {title:"Get to Know Us Better",items:[
                {q:"What is Cartwheel's mission?",content:(
                  <div style={{marginTop:12}}>
                    <p style={{fontSize:14,color:"#4a5568",lineHeight:1.75,margin:"0 0 16px"}}>
                      Cartwheel partners with K-12 schools to provide accessible mental health care to students — enabling earlier intervention, higher engagement, and better-coordinated care.
                    </p>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                      {[["58%","full remission of anxiety"],["3x","reduction in depression"],["92%","families recommend us"]].map(([n,l])=>(
                        <div key={n} style={{background:`linear-gradient(135deg, ${C.lightLavender}, #ddd8fb)`,borderRadius:10,padding:"14px",border:"1px solid rgba(177,165,247,0.3)"}}>
                          <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:20,color:C.indigo}}>{n}</div>
                          <div style={{fontSize:11,color:C.indigo,marginTop:3,lineHeight:1.4,opacity:0.75}}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )},
              ]},
            ].map((sec,si)=>(
              <FadeIn key={sec.title} delay={si*60}>
                <div>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,color:C.taupe,letterSpacing:"1px",textTransform:"uppercase",marginBottom:12}}>{sec.title}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {sec.items.map((item,i)=>(
                      <Accordion key={i} q={item.q}>{item.content}</Accordion>
                    ))}
                  </div>
                </div>
              </FadeIn>
            ))}

            {/* Social links */}
            <FadeIn delay={300}>
              <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                {[
                  {label:"Cartwheel.org",href:links.cartwheel,icon:<Globe size={13}/>},
                  {label:"Wall of Love",href:links.wallOfLove,icon:<Heart size={13}/>},
                  {label:"Glassdoor",href:links.glassdoor,icon:<Star size={13}/>},
                  {label:"LinkedIn",href:links.linkedin,icon:<Linkedin size={13}/>},
                ].filter(l=>l.href).map(({label,href,icon})=>(
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{
                    display:"inline-flex",alignItems:"center",gap:7,
                    background:C.white,border:"1px solid rgba(15,27,31,0.1)",
                    borderRadius:99,padding:"8px 16px",fontSize:13,
                    color:C.charcoal,textDecoration:"none",fontWeight:500,
                    boxShadow:"0 1px 3px rgba(15,27,31,0.05)",
                    transition:"all 0.15s ease",
                  }}>
                    <span style={{color:C.indigo}}>{icon}</span>{label}
                  </a>
                ))}
              </div>
            </FadeIn>

            <div style={{borderTop:"1px solid rgba(15,27,31,0.07)",paddingTop:16,display:"flex",justifyContent:"space-between"}}>
              <div style={{fontSize:12,color:C.taupe}}>Questions? Reach out to your coordinator at any time.</div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",color:C.taupe}}>Candidate Guide</div>
            </div>
          </div>
        )}

        {/* ── CHAT ── */}
        {tab==="chat"&&(
          <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 420px)",minHeight:420}}>
            <FadeIn delay={0}>
              <div style={{
                background:C.charcoal,borderRadius:14,padding:"16px 20px",marginBottom:20,
                display:"flex",alignItems:"center",gap:12,
              }}>
                <div style={{width:36,height:36,borderRadius:10,background:"rgba(177,165,247,0.15)",border:"1px solid rgba(177,165,247,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <WheelMark size={22}/>
                </div>
                <div>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:13,color:C.white}}>Cartwheel Copilot</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>Grounded in your role's hiring package</div>
                </div>
              </div>
            </FadeIn>

            <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:14,paddingBottom:16}}>
              {msgs.map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",alignItems:"flex-end",gap:10,animation:`fadeUp 0.3s ease both`,animationDelay:`${i*30}ms`}}>
                  {m.role==="assistant"&&(
                    <div style={{width:32,height:32,borderRadius:9,background:C.charcoal,border:"1px solid rgba(177,165,247,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <WheelMark size={19}/>
                    </div>
                  )}
                  <div style={{
                    maxWidth:"76%",padding:"13px 16px",
                    borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",
                    background:m.role==="user"?`linear-gradient(135deg, ${C.indigo}, #2d3d85)`:C.white,
                    color:m.role==="user"?C.white:C.charcoal,
                    fontSize:14,lineHeight:1.7,
                    border:m.role==="assistant"?"1px solid rgba(15,27,31,0.08)":"none",
                    boxShadow:m.role==="user"?"0 2px 12px rgba(57,75,153,0.25)":"0 1px 4px rgba(15,27,31,0.06)",
                    whiteSpace:"pre-wrap",
                  }}>{m.content}</div>
                </div>
              ))}
              {loading&&(
                <div style={{display:"flex",alignItems:"flex-end",gap:10}}>
                  <div style={{width:32,height:32,borderRadius:9,background:C.charcoal,border:"1px solid rgba(177,165,247,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}><WheelMark size={19}/></div>
                  <div style={{background:C.white,border:"1px solid rgba(15,27,31,0.08)",borderRadius:"14px 14px 14px 4px",padding:"14px 18px",display:"flex",gap:5,boxShadow:"0 1px 4px rgba(15,27,31,0.06)"}}>
                    {[0,1,2].map(d=><span key={d} style={{width:7,height:7,borderRadius:"50%",background:C.lavender,display:"inline-block",animation:`blink 1.4s infinite`,animationDelay:`${d*0.2}s`}}/>)}
                  </div>
                </div>
              )}
              <div ref={endRef}/>
            </div>

            {msgs.length<=1&&(
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,color:C.taupe,marginBottom:10,fontWeight:600,letterSpacing:"0.5px",textTransform:"uppercase"}}>Try asking</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {["What should I prepare for my first interview?","Who will I meet, and what do they focus on?","What does success look like in 90 days?","What's Cartwheel's culture actually like?"].map((q,i)=>(
                    <button key={i} onClick={()=>send(q)} style={{
                      background:C.white,border:"1px solid rgba(15,27,31,0.1)",
                      borderRadius:20,padding:"8px 14px",fontSize:13,color:C.charcoal,
                      cursor:"pointer",fontWeight:500,
                      boxShadow:"0 1px 3px rgba(15,27,31,0.05)",transition:"all 0.15s",
                    }}>{q}</button>
                  ))}
                </div>
              </div>
            )}

            <div style={{
              display:"flex",gap:10,background:C.white,borderRadius:14,
              border:"1px solid rgba(15,27,31,0.1)",padding:"10px 12px",
              boxShadow:"0 2px 8px rgba(15,27,31,0.06)",
            }}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
                placeholder="Ask anything about your interview..."
                style={{flex:1,border:"none",outline:"none",fontSize:14,color:C.charcoal,background:"transparent",fontFamily:"inherit"}}/>
              <button onClick={()=>send()} disabled={!input.trim()||loading} style={{
                background:input.trim()&&!loading?`linear-gradient(135deg, ${C.indigo}, #2d3d85)`:"rgba(15,27,31,0.08)",
                color:C.white,border:"none",borderRadius:10,padding:"9px 18px",fontSize:12,
                fontFamily:"'Montserrat',sans-serif",fontWeight:700,
                cursor:input.trim()&&!loading?"pointer":"default",transition:"all 0.2s",
              }}>Send</button>
            </div>
          </div>
        )}

        {/* ── ROADMAP ── */}
        {tab==="roadmap"&&(
          <div style={{display:"flex",flexDirection:"column",gap:28}}>
            <FadeIn delay={0}>
              <SectionHead>Interview Roadmap</SectionHead>
              <p style={{fontSize:14,color:"#4a5568",lineHeight:1.75,margin:"0 0 20px"}}>This process is designed to be mutual — you are evaluating us as much as we are evaluating you. We aim to share next steps clearly after each conversation.</p>
              <div style={{borderRadius:14,overflow:"hidden",border:"1px solid rgba(15,27,31,0.08)",boxShadow:"0 2px 12px rgba(15,27,31,0.06)"}}>
                <div style={{display:"grid",gridTemplateColumns:"2fr 0.6fr 2fr 2.5fr",background:C.charcoal}}>
                  {["STAGE","TIME","INTERVIEWERS","FOCUS"].map(h=>(
                    <div key={h} style={{padding:"12px 16px",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.4)",letterSpacing:"1.5px",fontFamily:"'Montserrat',sans-serif"}}>{h}</div>
                  ))}
                </div>
                {(role.stages||[]).map((r,i)=>{
                  const interviewer=(role.interviewers||[])[i];
                  return (
                    <div key={i} style={{
                      display:"grid",gridTemplateColumns:"2fr 0.6fr 2fr 2.5fr",
                      background:i%2===0?C.white:"rgba(240,236,233,0.4)",
                      borderTop:"1px solid rgba(15,27,31,0.05)",
                    }}>
                      <div style={{padding:"14px 16px",fontSize:13,color:C.charcoal,fontFamily:"'Montserrat',sans-serif",fontWeight:600}}>{r.stage}</div>
                      <div style={{padding:"14px 16px",fontSize:13}}>
                        <span style={{background:"rgba(57,75,153,0.08)",color:C.indigo,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,fontFamily:"'Montserrat',sans-serif"}}>{r.time}</span>
                      </div>
                      <div style={{padding:"14px 16px",fontSize:13,color:C.charcoal}}>
                        {interviewer&&interviewer.name
                          ? <InterviewerDisplay interviewer={interviewer}/>
                          : <span style={{color:C.taupe,fontSize:12}}>—</span>
                        }
                      </div>
                      <div style={{padding:"14px 16px",fontSize:13,color:"#4a5568",lineHeight:1.5}}>{r.focus}</div>
                    </div>
                  );
                })}
              </div>
            </FadeIn>

            <FadeIn delay={100}>
              <SectionHead>Stage-by-Stage Prep</SectionHead>
              <p style={{fontSize:14,color:"#4a5568",lineHeight:1.75,margin:"0 0 16px"}}>Each stage has a different focus. These notes will help you prepare without over-preparing.</p>
              <StagePrep role={role}/>
            </FadeIn>

            <FadeIn delay={160}>
              <SectionHead>Is This Role a Fit?</SectionHead>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div style={{background:`linear-gradient(160deg, ${C.forest} 0%, #1d4038 100%)`,borderRadius:14,padding:"22px",boxShadow:"0 4px 20px rgba(38,84,79,0.2)"}}>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:11,color:"rgba(163,207,153,0.7)",marginBottom:14,letterSpacing:"1px",textTransform:"uppercase"}}>You'll thrive if you</div>
                  {(role.thrive||[]).map((t,i)=>(
                    <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
                      <Check size={13} color={C.mint} style={{flexShrink:0,marginTop:2}}/>
                      <span style={{fontSize:13,color:"rgba(255,255,255,0.8)",lineHeight:1.55}}>{t}</span>
                    </div>
                  ))}
                </div>
                <div style={{background:"rgba(240,236,233,0.8)",borderRadius:14,padding:"22px",border:"1px solid rgba(15,27,31,0.07)"}}>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:11,color:C.taupe,marginBottom:14,letterSpacing:"1px",textTransform:"uppercase"}}>This may not be right if you</div>
                  {(role.notfor||[]).map((t,i)=>(
                    <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
                      <X size={13} color={C.taupe} style={{flexShrink:0,marginTop:2}}/>
                      <span style={{fontSize:13,color:C.taupe,lineHeight:1.55}}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={220}>
              <SectionHead>What Success Looks Like</SectionHead>
              <div style={{borderRadius:14,overflow:"hidden",border:"1px solid rgba(15,27,31,0.08)",boxShadow:"0 2px 8px rgba(15,27,31,0.05)"}}>
                {(role.success||[]).map(({period,desc},i)=>(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"160px 1fr",background:i%2===0?C.white:"rgba(240,236,233,0.4)",borderTop:i===0?"none":"1px solid rgba(15,27,31,0.05)"}}>
                    <div style={{padding:"18px 16px",fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,color:C.forest,borderRight:"1px solid rgba(15,27,31,0.05)"}}>{period}</div>
                    <div style={{padding:"18px 16px",fontSize:13,color:"#4a5568",lineHeight:1.7}}>{desc}</div>
                  </div>
                ))}
              </div>
            </FadeIn>

            <div style={{borderTop:"1px solid rgba(15,27,31,0.07)",paddingTop:16,display:"flex",justifyContent:"space-between"}}>
              <div style={{fontSize:12,color:C.taupe}}>Questions? Reach out to your coordinator at any time.</div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",color:C.taupe}}>Roadmap</div>
            </div>
          </div>
        )}

        {/* ── CULTURE ── */}
        {tab==="culture"&&(
          <div style={{display:"flex",flexDirection:"column",gap:24}}>
            <FadeIn delay={0}>
              <div style={{
                background:`linear-gradient(135deg, ${C.charcoal} 0%, #1a2f35 100%)`,
                borderRadius:16,padding:"32px",
                boxShadow:"0 8px 32px rgba(15,27,31,0.15)",
              }}>
                <SectionLabel light>What sets us apart</SectionLabel>
                <p style={{fontSize:16,color:"rgba(255,255,255,0.75)",lineHeight:1.75,margin:"0 0 24px",fontStyle:"normal"}}>
                  It's not just the impact we deliver in schools — it's also how we work. Fully remote, transparent, and human-first, with leaders who model vulnerability and a team that celebrates connection.
                </p>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {[
                    {icon:<Sun size={16}/>,title:"Our rituals matter",desc:`We share "sunbeams" that remind us why we're here. We spotlight teammates in "Humans of Cartwheel" to celebrate the whole person.`},
                    {icon:<Shield size={16}/>,title:"Transparency is the norm",desc:"Leadership shares financials and strategic debates openly — including mistakes and uncertainties — because that's how we all get better."},
                    {icon:<Heart size={16}/>,title:"Vulnerability is strength",desc:"Founders model it first: admitting when they're wrong, asking for feedback, showing up as whole humans. That permission creates space for everyone."},
                  ].map(({icon,title,desc})=>(
                    <div key={title} style={{display:"flex",gap:14,alignItems:"flex-start",background:"rgba(255,255,255,0.05)",borderRadius:12,padding:"18px 20px",border:"1px solid rgba(255,255,255,0.08)"}}>
                      <div style={{color:C.lavender,flexShrink:0,marginTop:1}}>{icon}</div>
                      <div>
                        <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:14,color:C.white,marginBottom:5}}>{title}</div>
                        <div style={{fontSize:13,color:"rgba(255,255,255,0.55)",lineHeight:1.7}}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={100}>
              <SectionHead>Compensation + Benefits</SectionHead>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
                {[
                  {icon:<Coffee size={14}/>,title:"401(k) Match",sub:"2% employer contribution"},
                  {icon:<Heart size={14}/>,title:"Premium Health",sub:"Medical, dental, orthodontia, vision"},
                  {icon:<Users size={14}/>,title:"Paid Parental Leave",sub:"12 weeks after 1 year of tenure"},
                  {icon:<Plane size={14}/>,title:"Annual Retreat",sub:"Connect with teammates IRL"},
                  {icon:<BookMarked size={14}/>,title:"Prof. Development",sub:"$500 annual stipend"},
                  {icon:<Calendar size={14}/>,title:"Generous PTO",sub:"Including company closure 12/25-1/1"},
                ].map(({icon,title,sub})=>(
                  <div key={title} style={{
                    background:C.white,borderRadius:12,padding:"18px 16px",
                    border:"1px solid rgba(15,27,31,0.08)",
                    boxShadow:"0 1px 4px rgba(15,27,31,0.04)",
                    transition:"all 0.2s",
                  }}>
                    <div style={{color:C.forest,marginBottom:8}}>{icon}</div>
                    <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:13,color:C.charcoal,marginBottom:4}}>{title}</div>
                    <div style={{fontSize:12,color:C.taupe,lineHeight:1.5}}>{sub}</div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:13,color:C.taupe,paddingLeft:4}}>MacBook provided &bull; Flexible remote-first</div>
            </FadeIn>

            <FadeIn delay={160}>
              <SectionHead>Get to Know Us Better</SectionHead>
              <MissionDropdown/>
              <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:14}}>
                {[
                  {label:"Cartwheel.org",href:links.cartwheel,icon:<Globe size={13}/>},
                  {label:"Wall of Love",href:links.wallOfLove,icon:<Heart size={13}/>},
                  {label:"Glassdoor",href:links.glassdoor,icon:<Star size={13}/>},
                  {label:"LinkedIn",href:links.linkedin,icon:<Linkedin size={13}/>},
                ].filter(l=>l.href).map(({label,href,icon})=>(
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{
                    display:"inline-flex",alignItems:"center",gap:7,
                    background:C.white,border:"1px solid rgba(15,27,31,0.1)",borderRadius:99,
                    padding:"8px 16px",fontSize:13,color:C.charcoal,textDecoration:"none",fontWeight:500,
                    boxShadow:"0 1px 3px rgba(15,27,31,0.05)",
                  }}>
                    <span style={{color:C.indigo}}>{icon}</span>{label}
                  </a>
                ))}
              </div>
            </FadeIn>

            <div style={{borderTop:"1px solid rgba(15,27,31,0.07)",paddingTop:16,display:"flex",justifyContent:"space-between"}}>
              <div style={{fontSize:12,color:C.taupe}}>Questions? Reach out to your coordinator at any time.</div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",color:C.taupe}}>Life at Cartwheel</div>
            </div>
          </div>
        )}

        {/* ── CHECKLIST ── */}
        {tab==="checklist"&&(
          <div>
            <FadeIn delay={0}>
              <SectionHead>Your Prep Checklist</SectionHead>
              <p style={{fontSize:14,color:"#4a5568",lineHeight:1.75,margin:"0 0 20px"}}>Work through each stage at your own pace. You don't need to complete everything — focus on the rounds coming up next.</p>
              <PrepChecklist role={role}/>
            </FadeIn>
            <div style={{marginTop:28,borderTop:"1px solid rgba(15,27,31,0.07)",paddingTop:16,display:"flex",justifyContent:"space-between"}}>
              <div style={{fontSize:12,color:C.taupe}}>Questions? Reach out to your coordinator at any time.</div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",color:C.taupe}}>Checklist</div>
            </div>
          </div>
        )}

        {/* ── JOB DESCRIPTION ── */}
        {tab==="jd"&&(
          <div style={{display:"flex",flexDirection:"column",gap:28}}>
            <FadeIn delay={0}>
              <div style={{display:"inline-flex",gap:8,flexWrap:"wrap"}}>
                <span style={{background:`linear-gradient(135deg, ${C.lightLavender}, #ddd8fb)`,borderRadius:99,padding:"5px 14px",fontSize:12,fontWeight:700,color:C.indigo,border:"1px solid rgba(177,165,247,0.3)"}}>{role.comp}</span>
                <span style={{background:C.white,borderRadius:99,padding:"5px 14px",fontSize:12,fontWeight:600,color:C.charcoal,border:"1px solid rgba(15,27,31,0.1)"}}>{role.location}</span>
                <span style={{background:C.white,borderRadius:99,padding:"5px 14px",fontSize:12,fontWeight:600,color:C.charcoal,border:"1px solid rgba(15,27,31,0.1)"}}>{role.employment}</span>
              </div>
            </FadeIn>

            {[
              {heading:"About the Role",content:role.aboutRole},
              {heading:"What You'll Do",subsections:role.whatYoullDo},
              {heading:"Must Have",bullets:role.mustHave},
              {heading:"Nice to Have",bullets:role.niceToHave},
              {heading:"Compensation and Benefits",content:role.compBenefits},
            ].map((sec,i)=>(
              <FadeIn key={i} delay={i*50}>
                <div>
                  <h3 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:15,color:C.charcoal,margin:"0 0 12px",paddingBottom:10,borderBottom:"1px solid rgba(15,27,31,0.07)"}}>{sec.heading}</h3>
                  {sec.content&&<p style={{fontSize:14,color:"#4a5568",lineHeight:1.8,margin:0,whiteSpace:"pre-line"}}>{sec.content}</p>}
                  {sec.bullets&&(
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {sec.bullets.map((item,j)=>(
                        <div key={j} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                          <div style={{width:5,height:5,borderRadius:"50%",background:C.lavender,flexShrink:0,marginTop:8}}/>
                          <span style={{fontSize:14,color:"#4a5568",lineHeight:1.65}}>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {sec.subsections&&sec.subsections.map((sub,j)=>(
                    <div key={j} style={{marginBottom:18}}>
                      <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,color:C.forest,marginBottom:8,letterSpacing:"0.3px"}}>{sub.label}</div>
                      <div style={{display:"flex",flexDirection:"column",gap:7}}>
                        {sub.bullets.map((b,k)=>(
                          <div key={k} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                            <div style={{width:5,height:5,borderRadius:"50%",background:C.lavender,flexShrink:0,marginTop:8}}/>
                            <span style={{fontSize:14,color:"#4a5568",lineHeight:1.65}}>{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </FadeIn>
            ))}

            <FadeIn delay={300}>
              <div style={{background:`linear-gradient(135deg, rgba(163,207,153,0.15), rgba(211,231,204,0.3))`,borderRadius:12,padding:"18px 20px",border:"1px solid rgba(163,207,153,0.3)"}}>
                <p style={{fontSize:14,color:C.charcoal,lineHeight:1.7,margin:0}}>
                  <strong>Don't meet every requirement?</strong> Apply anyway. If your experience doesn't match exactly but you bring relevant skills and genuine interest, we want to hear from you.
                </p>
              </div>
            </FadeIn>

            <div style={{borderTop:"1px solid rgba(15,27,31,0.07)",paddingTop:16,display:"flex",justifyContent:"space-between"}}>
              <div style={{fontSize:12,color:C.taupe}}>Questions? Reach out to your coordinator at any time.</div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",color:C.taupe}}>Job Description</div>
            </div>
          </div>
        )}

      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes blink { 0%,100%{opacity:0.2} 50%{opacity:1} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ADMIN LOGIN
// ══════════════════════════════════════════════════════════════
function AdminLogin({onSuccess}) {
  const [pw,setPw]=useState("");
  const [error,setError]=useState(false);
  const [shake,setShake]=useState(false);
  const attempt=()=>{
    if(pw===ADMIN_PASSWORD){onSuccess();}
    else{setError(true);setPw("");setShake(true);setTimeout(()=>setShake(false),500);}
  };
  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg, ${C.charcoal} 0%, #1a2f35 100%)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}>
      <div style={{
        background:"rgba(255,255,255,0.03)",backdropFilter:"blur(12px)",
        borderRadius:20,border:"1px solid rgba(255,255,255,0.08)",
        padding:"48px 44px",width:"100%",maxWidth:380,textAlign:"center",
        boxShadow:"0 24px 64px rgba(0,0,0,0.3)",
        animation:shake?"shake 0.4s ease":"none",
      }}>
        <div style={{marginBottom:24,display:"flex",justifyContent:"center"}}><WheelMark size={48}/></div>
        <h1 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:20,color:C.white,margin:"0 0 6px"}}>Admin Access</h1>
        <p style={{fontSize:13,color:"rgba(255,255,255,0.35)",margin:"0 0 28px"}}>Cartwheel Copilot Platform</p>
        <div style={{position:"relative",marginBottom:error?8:20}}>
          <Lock size={14} color="rgba(255,255,255,0.25)" style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)"}}/>
          <input type="password" value={pw}
            onChange={e=>{setPw(e.target.value);setError(false);}}
            onKeyDown={e=>e.key==="Enter"&&attempt()}
            placeholder="Enter password"
            style={{
              width:"100%",padding:"12px 14px 12px 38px",
              background:"rgba(255,255,255,0.06)",
              border:`1px solid ${error?"rgba(235,168,155,0.4)":"rgba(255,255,255,0.1)"}`,
              borderRadius:10,fontSize:14,color:C.white,
              fontFamily:"inherit",outline:"none",boxSizing:"border-box",
              transition:"border-color 0.2s",
            }}/>
        </div>
        {error&&<p style={{fontSize:12,color:C.peach,margin:"0 0 16px"}}>Incorrect password. Please try again.</p>}
        <button onClick={attempt} style={{
          width:"100%",
          background:`linear-gradient(135deg, ${C.indigo}, #2d3d85)`,
          color:C.white,border:"none",borderRadius:10,padding:"13px",
          fontSize:13,fontFamily:"'Montserrat',sans-serif",fontWeight:700,
          cursor:"pointer",boxShadow:"0 4px 16px rgba(57,75,153,0.3)",
          transition:"all 0.2s",
        }}>Sign In</button>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Inter:wght@400;500&display=swap');
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════
function AdminDashboard({allRoles,onPublish,onPreview,onDelete,onLogout}) {
  const [step,setStep]=useState("list");
  const [pasteText,setPasteText]=useState("");
  const [parsing,setParsing]=useState(false);
  const [parsed,setParsed]=useState(null);
  const [parseError,setParseError]=useState("");
  const [saving,setSaving]=useState(false);
  const [editField,setEditField]=useState(null);
  const [copied,setCopied]=useState(null);

  const handleParse=async()=>{
    if(!pasteText.trim())return;
    setParsing(true);setParseError("");
    try{
      const raw=await callClaude(PARSE_SYSTEM,[{role:"user",content:pasteText}],3000);
      const clean=raw.replace(/```json|```/g,"").trim();
      setParsed(JSON.parse(clean));setStep("review");
    }catch(e){setParseError("Parsing failed. Check the content and try again.");}
    setParsing(false);
  };

  const handlePublish=async()=>{
    if(!parsed)return;
    setSaving(true);
    await saveRole(parsed);
    onPublish(parsed);
    setSaving(false);
    setStep("list");setParsed(null);setPasteText("");
  };

  const copyLink=(slug)=>{
    try{navigator.clipboard.writeText(`${window.location.origin}?role=${slug}`);setCopied(slug);setTimeout(()=>setCopied(null),2000);}catch(e){}
  };

  return (
    <div style={{fontFamily:"'Inter',sans-serif",minHeight:"100vh",background:`linear-gradient(180deg, ${C.charcoal} 0%, #0d1a1d 100%)`,color:C.white}}>

      {/* Admin header */}
      <div style={{padding:"16px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <Wordmark light/>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <span style={{fontSize:12,color:"rgba(255,255,255,0.3)",fontFamily:"'Montserrat',sans-serif",letterSpacing:"0.5px"}}>Admin</span>
          <button onClick={onLogout} style={{
            display:"flex",alignItems:"center",gap:6,
            fontSize:12,color:"rgba(255,255,255,0.4)",background:"rgba(255,255,255,0.05)",
            border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"6px 12px",
            cursor:"pointer",fontFamily:"'Montserrat',sans-serif",fontWeight:600,
            transition:"all 0.15s",
          }}>
            <LogOut size={12}/> Log out
          </button>
        </div>
      </div>

      <div style={{maxWidth:860,margin:"0 auto",padding:"40px 32px"}}>

        {step==="list"&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:32,flexWrap:"wrap",gap:12}}>
              <div>
                <h1 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:24,color:C.white,margin:"0 0 6px",letterSpacing:"-0.4px"}}>Active Roles</h1>
                <p style={{fontSize:14,color:"rgba(255,255,255,0.35)",margin:0}}>{allRoles.length} role{allRoles.length!==1?"s":""} published</p>
              </div>
              <button onClick={()=>setStep("paste")} style={{
                background:`linear-gradient(135deg, ${C.indigo}, #2d3d85)`,
                color:C.white,border:"none",borderRadius:10,padding:"11px 20px",
                fontSize:13,fontFamily:"'Montserrat',sans-serif",fontWeight:700,cursor:"pointer",
                display:"flex",alignItems:"center",gap:8,
                boxShadow:"0 4px 16px rgba(57,75,153,0.3)",
              }}>
                <Plus size={14}/> Add New Role
              </button>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {allRoles.map(role=>(
                <div key={role.slug} style={{
                  background:"rgba(255,255,255,0.04)",borderRadius:14,
                  border:"1px solid rgba(255,255,255,0.07)",padding:"20px 24px",
                  display:"flex",justifyContent:"space-between",alignItems:"center",
                  flexWrap:"wrap",gap:12,
                  transition:"background 0.2s",
                }}>
                  <div>
                    <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:16,color:C.white,marginBottom:4}}>{role.title}</div>
                    <div style={{fontSize:13,color:"rgba(255,255,255,0.35)",marginBottom:8}}>{role.department} &bull; {role.location} &bull; {role.comp}</div>
                    <div style={{
                      fontSize:11,color:C.lavender,fontFamily:"monospace",
                      background:"rgba(177,165,247,0.1)",border:"1px solid rgba(177,165,247,0.15)",
                      padding:"3px 10px",borderRadius:6,display:"inline-block",
                    }}>?role={role.slug}</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>onPreview(role)} style={{
                      background:"rgba(57,75,153,0.2)",color:C.lavender,border:"1px solid rgba(57,75,153,0.3)",
                      borderRadius:8,padding:"8px 16px",fontSize:12,
                      fontFamily:"'Montserrat',sans-serif",fontWeight:700,cursor:"pointer",
                      display:"flex",alignItems:"center",gap:6,transition:"all 0.15s",
                    }}><Eye size={12}/> Preview</button>
                    <button onClick={()=>copyLink(role.slug)} style={{
                      background:copied===role.slug?"rgba(38,84,79,0.3)":"rgba(255,255,255,0.05)",
                      color:copied===role.slug?C.mint:"rgba(255,255,255,0.6)",
                      border:`1px solid ${copied===role.slug?"rgba(163,207,153,0.3)":"rgba(255,255,255,0.1)"}`,
                      borderRadius:8,padding:"8px 16px",fontSize:12,
                      fontFamily:"'Montserrat',sans-serif",fontWeight:700,cursor:"pointer",
                      display:"flex",alignItems:"center",gap:6,transition:"all 0.2s",
                    }}>
                      {copied===role.slug?<><Check size={12}/>Copied</>:<><Copy size={12}/>Copy Link</>}
                    </button>
                    {!BUILT_IN_ROLES.find(r=>r.slug===role.slug)&&(
                      <button onClick={()=>onDelete(role.slug)} style={{
                        background:"rgba(92,30,55,0.2)",color:"rgba(235,168,155,0.7)",
                        border:"1px solid rgba(92,30,55,0.3)",borderRadius:8,padding:"8px 12px",
                        fontSize:12,fontFamily:"'Montserrat',sans-serif",fontWeight:700,
                        cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all 0.15s",
                      }}><Trash2 size={12}/></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {step==="paste"&&(
          <>
            <button onClick={()=>setStep("list")} style={{background:"none",border:"none",color:"rgba(255,255,255,0.4)",fontSize:13,fontWeight:600,cursor:"pointer",padding:"0 0 24px",fontFamily:"'Montserrat',sans-serif",display:"flex",alignItems:"center",gap:6}}>
              <ArrowLeft size={13}/> Back to roles
            </button>
            <h1 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:22,color:C.white,margin:"0 0 8px",letterSpacing:"-0.4px"}}>Add New Role</h1>
            <p style={{fontSize:14,color:"rgba(255,255,255,0.4)",margin:"0 0 28px",lineHeight:1.6}}>Paste your hiring package below. Claude will extract structured data and generate the candidate experience automatically.</p>
            <div style={{background:"rgba(255,255,255,0.03)",borderRadius:14,border:"1px solid rgba(255,255,255,0.07)",overflow:"hidden",marginBottom:16}}>
              <div style={{padding:"12px 18px",borderBottom:"1px solid rgba(255,255,255,0.06)",fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.3)",letterSpacing:"1px",textTransform:"uppercase",fontFamily:"'Montserrat',sans-serif"}}>Hiring Package</div>
              <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)}
                placeholder="Paste job description, success profile, interview plan, interviewer details, compensation..."
                style={{width:"100%",minHeight:300,padding:"18px",border:"none",outline:"none",fontSize:14,lineHeight:1.7,color:C.white,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box",background:"transparent"}}/>
            </div>
            {parseError&&<div style={{background:"rgba(92,30,55,0.2)",borderRadius:8,padding:"12px 16px",fontSize:13,color:C.peach,marginBottom:16,border:"1px solid rgba(92,30,55,0.3)"}}>{parseError}</div>}
            <button onClick={handleParse} disabled={!pasteText.trim()||parsing} style={{
              background:pasteText.trim()&&!parsing?`linear-gradient(135deg, ${C.indigo}, #2d3d85)`:"rgba(255,255,255,0.06)",
              color:pasteText.trim()&&!parsing?C.white:"rgba(255,255,255,0.3)",
              border:"none",borderRadius:10,padding:"13px 28px",fontSize:13,
              fontFamily:"'Montserrat',sans-serif",fontWeight:700,
              cursor:pasteText.trim()&&!parsing?"pointer":"default",
              transition:"all 0.2s",
            }}>
              {parsing?"Parsing with Claude...":"Parse Hiring Package"}
            </button>
          </>
        )}

        {step==="review"&&parsed&&(
          <>
            <button onClick={()=>setStep("paste")} style={{background:"none",border:"none",color:"rgba(255,255,255,0.4)",fontSize:13,fontWeight:600,cursor:"pointer",padding:"0 0 24px",fontFamily:"'Montserrat',sans-serif",display:"flex",alignItems:"center",gap:6}}>
              <ArrowLeft size={13}/> Back to paste
            </button>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,flexWrap:"wrap",gap:12}}>
              <div>
                <h1 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:22,color:C.white,margin:"0 0 6px",letterSpacing:"-0.4px"}}>Review Parsed Data</h1>
                <p style={{fontSize:14,color:"rgba(255,255,255,0.35)",margin:0}}>Review before publishing. Click any field to edit.</p>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>onPreview(parsed)} style={{
                  background:"rgba(177,165,247,0.1)",color:C.lavender,border:"1px solid rgba(177,165,247,0.2)",
                  borderRadius:10,padding:"10px 18px",fontSize:13,fontFamily:"'Montserrat',sans-serif",fontWeight:700,cursor:"pointer",
                  display:"flex",alignItems:"center",gap:6,
                }}><Eye size={13}/> Preview</button>
                <button onClick={handlePublish} disabled={saving} style={{
                  background:`linear-gradient(135deg, ${C.forest}, #1d4038)`,color:C.white,border:"none",
                  borderRadius:10,padding:"10px 18px",fontSize:13,fontFamily:"'Montserrat',sans-serif",fontWeight:700,cursor:"pointer",
                  display:"flex",alignItems:"center",gap:6,
                  boxShadow:"0 4px 16px rgba(38,84,79,0.3)",
                }}>
                  <Check size={13}/> {saving?"Publishing...":"Publish Role"}
                </button>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              {[["Title",parsed.title,"title"],["Slug (URL)",parsed.slug,"slug"],["Department",parsed.department,"department"],["Reports To",parsed.reportsto,"reportsto"],["Location",parsed.location,"location"],["Compensation",parsed.comp,"comp"]].map(([label,val,key])=>(
                <div key={key} style={{background:"rgba(255,255,255,0.04)",borderRadius:10,border:"1px solid rgba(255,255,255,0.07)",padding:"14px 16px"}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:"rgba(255,255,255,0.3)",marginBottom:6,fontFamily:"'Montserrat',sans-serif"}}>{label}</div>
                  {editField===key?(
                    <input autoFocus defaultValue={val}
                      onBlur={e=>{setParsed(p=>({...p,[key]:e.target.value}));setEditField(null);}}
                      style={{width:"100%",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(177,165,247,0.3)",borderRadius:6,padding:"6px 10px",fontSize:14,color:C.white,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                  ):(
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                      <span style={{fontSize:14,color:C.white,fontWeight:500}}>{val}</span>
                      <button onClick={()=>setEditField(key)} style={{fontSize:11,color:"rgba(177,165,247,0.6)",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Edit</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{background:"rgba(255,255,255,0.03)",borderRadius:10,border:"1px solid rgba(255,255,255,0.07)",padding:"16px",marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:"rgba(255,255,255,0.3)",marginBottom:10,fontFamily:"'Montserrat',sans-serif"}}>Mission</div>
              <p style={{fontSize:14,color:"rgba(255,255,255,0.6)",lineHeight:1.7,margin:0,fontStyle:"italic"}}>{parsed.mission}</p>
            </div>

            <div style={{background:"rgba(255,255,255,0.03)",borderRadius:10,border:"1px solid rgba(255,255,255,0.07)",padding:"16px",marginBottom:20}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:"rgba(255,255,255,0.3)",marginBottom:12,fontFamily:"'Montserrat',sans-serif"}}>Interview Stages ({parsed.stages?.length})</div>
              {(parsed.stages||[]).map((s,i)=>(
                <div key={i} style={{display:"flex",gap:12,padding:"8px 0",borderBottom:i<(parsed.stages.length-1)?"1px solid rgba(255,255,255,0.04)":"none",alignItems:"center"}}>
                  <span style={{background:"rgba(57,75,153,0.2)",color:C.lavender,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,fontFamily:"'Montserrat',sans-serif",whiteSpace:"nowrap"}}>{s.time}</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.white}}>{s.stage}</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.35)"}}>{s.who} &bull; {s.focus}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{background:"rgba(38,84,79,0.15)",borderRadius:10,padding:"14px 18px",fontSize:13,color:"rgba(163,207,153,0.8)",lineHeight:1.6,border:"1px solid rgba(38,84,79,0.3)"}}>
              Preview the candidate experience before publishing. Changes to role data require re-parsing.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [allRoles,setAllRoles]=useState([...BUILT_IN_ROLES]);
  const [view,setView]=useState("loading");
  const [activeRole,setActiveRole]=useState(null);
  const [adminAuthed,setAdminAuthed]=useState(false);
  const [loaded,setLoaded]=useState(false);

  useEffect(()=>{
    (async()=>{
      try{
        const saved=await loadAllRoles();
        const merged=[...BUILT_IN_ROLES,...saved.filter(r=>!BUILT_IN_ROLES.find(b=>b.slug===r.slug))];
        setAllRoles(merged);
        const params=new URLSearchParams(window.location.search);
        const roleParam=params.get("role");
        const isAdmin=window.location.pathname==="/admin"||params.get("admin")==="true";
        if(isAdmin){setView("admin");}
        else if(roleParam){
          const match=merged.find(r=>r.slug===roleParam);
          if(match){setActiveRole(match);setView("candidate");}
          else{setView("admin");}
        }else{setView("admin");}
      }catch(e){setView("admin");}
      setLoaded(true);
    })();
  },[]);

  const handlePublish=(role)=>setAllRoles(prev=>[...prev.filter(r=>r.slug!==role.slug),role]);
  const handleDelete=async(slug)=>{await deleteRole(slug);setAllRoles(prev=>prev.filter(r=>r.slug!==slug));};
  const handlePreview=(role)=>{setActiveRole(role);setView("candidate");window.history.pushState({},"",`?role=${role.slug}`);};
  const handleBack=()=>{setView("admin");window.history.pushState({},"",window.location.pathname);};
  const handleLogout=()=>{setAdminAuthed(false);};

  if(!loaded) return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.charcoal,fontFamily:"'Inter',sans-serif"}}>
      <div style={{textAlign:"center",animation:"fadeUp 0.5s ease both"}}>
        <WheelMark size={52}/>
        <div style={{marginTop:16,fontSize:13,color:"rgba(255,255,255,0.3)",fontFamily:"'Montserrat',sans-serif",letterSpacing:"0.5px"}}>Loading</div>
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );

  if(view==="candidate"&&activeRole) return <CandidateView role={activeRole} onBack={adminAuthed?handleBack:null}/>;
  if(view==="admin"&&!adminAuthed) return <AdminLogin onSuccess={()=>setAdminAuthed(true)}/>;
  if(view==="admin"&&adminAuthed) return <AdminDashboard allRoles={allRoles} onPublish={handlePublish} onPreview={handlePreview} onDelete={handleDelete} onLogout={handleLogout}/>;
  return null;
}
