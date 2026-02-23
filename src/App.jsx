import { useState, useRef, useEffect } from "react";

const C = {
  charcoal:"#0F1B1F", forest:"#26544F", indigo:"#394B99",
  lavender:"#B1A5F7", lightLavender:"#D8D2FB",
  mint:"#A7CF99", lightMint:"#D3E7CC",
  peach:"#EBA89B", lightPeach:"#F5D3CD",
  sand:"#F0ECE9", taupe:"#9C9283", brick:"#5C1E37",
  orange:"#F0702E", white:"#FFFFFF",
};

const ADMIN_PASSWORD = "cartwheel2026";

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

function Wordmark({ light=false }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:9}}>
      <WheelMark size={28}/>
      <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:19,
        color:light?C.white:C.charcoal,letterSpacing:"-0.2px"}}>Cartwheel</span>
    </div>
  );
}

function CWBullet({color=C.lavender,size=13}) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{flexShrink:0,marginTop:2}}>
      <rect x="0" y="5.5" width="14" height="3" rx="1.5" fill={color}/>
      <rect x="5.5" y="0" width="3" height="14" rx="1.5" fill={color}/>
    </svg>
  );
}

function DiamondShape({color=C.lavender,size=13}) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{flexShrink:0,marginTop:1}}>
      <rect x="2" y="2" width="10" height="10" rx="2" fill={color}
        style={{transformOrigin:"7px 7px",transform:"rotate(45deg)"}}/>
    </svg>
  );
}

function SectionHead({children}) {
  return (
    <div style={{marginBottom:16}}>
      <h2 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:500,fontSize:20,color:C.charcoal,margin:"0 0 8px"}}>{children}</h2>
      <div style={{height:1,background:"#e2ddd8"}}/>
    </div>
  );
}

function BulletList({items,color=C.lavender}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {items.map((item,i)=>(
        <div key={i} style={{display:"flex",gap:9,alignItems:"flex-start"}}>
          <CWBullet color={color} size={12}/>
          <span style={{fontSize:14,color:"#444",lineHeight:1.6}}>{item}</span>
        </div>
      ))}
    </div>
  );
}

function ExtLink({href,children}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{color:C.indigo,textDecoration:"none",fontWeight:600,borderBottom:`1px solid ${C.lightLavender}`,paddingBottom:1}}>
      {children}
    </a>
  );
}

function Footer({label}) {
  return (
    <div style={{borderTop:`1px solid #e2ddd8`,paddingTop:16,display:"flex",justifyContent:"space-between"}}>
      <div style={{fontSize:12,color:C.taupe}}>Questions? Reach out to your coordinator at any time!</div>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",color:C.taupe}}>{label}</div>
    </div>
  );
}

async function callClaude(system, messages, maxTokens=3000) {
  const res = await fetch("/api/chat", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,system,messages}),
  });
  const d = await res.json();
  return d.content?.[0]?.text || "";
}

async function saveRole(role) {
  try {
    await window.storage.set(`role:${role.slug}`, JSON.stringify(role));
    let idx = [];
    try { const r = await window.storage.get("role-index"); if(r) idx=JSON.parse(r.value); } catch(e){}
    if(!idx.includes(role.slug)) idx.push(role.slug);
    await window.storage.set("role-index", JSON.stringify(idx));
  } catch(e) { console.error("Storage error:", e); }
}

async function loadAllRoles() {
  let idx = [];
  try { const r = await window.storage.get("role-index"); if(r) idx=JSON.parse(r.value); } catch(e){}
  const roles = [];
  for(const slug of idx) {
    try { const r = await window.storage.get(`role:${slug}`); if(r) roles.push(JSON.parse(r.value)); } catch(e){}
  }
  return roles;
}

async function deleteRole(slug) {
  try { await window.storage.delete(`role:${slug}`); } catch(e){}
  let idx = [];
  try { const r = await window.storage.get("role-index"); if(r) idx=JSON.parse(r.value); } catch(e){}
  await window.storage.set("role-index", JSON.stringify(idx.filter(s=>s!==slug)));
}

const PARSE_SYSTEM = `You are an expert at extracting structured data from Cartwheel hiring packages.
Given raw hiring package text, return ONLY a valid JSON object (no markdown, no backticks) with this structure:
{
  "title": "Job title",
  "slug": "url-safe-lowercase-slug",
  "department": "Department",
  "reportsto": "Name and title of hiring manager",
  "location": "Remote or location",
  "employment": "Full-Time, W2",
  "comp": "$X - $Y",
  "mission": "1-2 sentence mission/purpose for this role",
  "stats": [{"n":"350+","label":"School Districts","sub":"Serving 2.5% of U.S. districts"}],
  "team": ["Name - Title (note)"],
  "stages": [{"stage":"Name","time":"30m","who":"Interviewer","focus":"Focus"}],
  "contacts": ["Role: Name (email)"],
  "prep": ["tip 1"],
  "thrive": ["item 1"],
  "notfor": ["item 1"],
  "success": [{"period":"First 90 Days","desc":"..."}],
  "mustHave": ["req 1"],
  "niceToHave": ["nice 1"],
  "whatYoullDo": [{"label":"Section","bullets":["bullet"]}],
  "aboutRole": "2-3 sentence overview",
  "compBenefits": "comp + benefits summary",
  "stagePrepData": [{"stage":"Stage name","prep":["tip"],"questions":["question"]}],
  "checklist": [{"stage":"Before Stage","items":["item"]}],
  "interviewers": [{"label":"Stage label","name":"Full name","title":"title or empty","href":"linkedin or mailto or null","hrefs":null}],
  "links": {"cartwheel":"https://www.cartwheel.org","wallOfLove":"https://www.cartwheel.org/wall-of-love","glassdoor":null,"linkedin":"https://www.linkedin.com/company/cartwheelcare/posts/?feedView=all"}
}
Return ONLY valid JSON.`;

const PDA_ROLE = {
  title:"Principal Data Analyst", slug:"principal-data-analyst",
  department:"Data", reportsto:"Jacob Savos, Director of Data",
  location:"Remote", employment:"Full-Time, W2", comp:"$170,000 - $210,000",
  mission:"Shape Cartwheel's analytics foundation — designing scalable data systems that directly improve how we deliver mental health care to students across the country.",
  stats:[{n:"350+",label:"School Districts",sub:"Serving 2.5% of U.S. districts"},{n:"$20M",label:"in ARR",sub:"Achieved in just 3 years"},{n:"300%",label:"YoY Growth",sub:"Capital-efficient scale"},{n:"1.5M",label:"Students",sub:"Enrolled across districts"}],
  team:["Jacob Savos — Director of Data (your hiring manager)","1 Analytics Manager","1 Senior Data Analyst","1 Staff Data Engineer","You — senior IC thought partner to Jacob"],
  stages:[
    {stage:"Recruiter Screen",time:"30m",who:"Caroline Colpini",focus:"Role fit, values, compensation"},
    {stage:"Hiring Manager",time:"30m",who:"Jacob Savos, Director of Data",focus:"Systems thinking, data modeling, strategic partnership"},
    {stage:"Take-Home Exercise",time:"60-90m",who:"Self-directed",focus:"SQL proficiency + analytical proposal"},
    {stage:"Technical Panel",time:"60m",who:"Nicholas Franchetti",focus:"Take-home review, data integrity, dashboards"},
    {stage:"Business Acumen",time:"30m",who:"Sam Blumpkin + Sam Bilow",focus:"Structured reasoning, business scenarios"},
    {stage:"Exec Review",time:"30m",who:"Daniel Ilkovich, CTO",focus:"Final alignment"},
  ],
  contacts:["Recruiter: Caroline Colpini — caroline.colpini@cartwheelcare.org","Coordinator: Avery Henry — avery.henry@cartwheelcare.org","Take-home questions: Jacob Savos — jacob.savos@cartwheelcare.org"],
  prep:["Bring 1-2 examples of analytics systems or metrics frameworks you've designed end-to-end","Walk through: context, approach, tradeoffs, validation, impact","Think about how your work scales — foundations, not one-off outputs","Be your authentic self — this is mutual fit, not a test"],
  thrive:["Are a systems thinker who cares about foundations, not just outputs","Take ownership from concept through durable implementation","Want to build something that outlasts your tenure","Are genuinely excited by student mental health impact"],
  notfor:["Get stuck designing the perfect system before shipping","Build technically elegant solutions that miss real business needs","Prefer isolated specialization over cross-team ownership","See governance and documentation as overhead"],
  success:[
    {period:"First 90 Days",desc:"Audit data systems, ship one small improvement, build key relationships, and propose 2-3 architecture priorities."},
    {period:"First 6 Months",desc:"Core analytical models well-designed and trusted. Metrics defined consistently. Self-service analytics enabling Product, Clinical, and Ops teams."},
    {period:"First 12 Months",desc:"Analytics shifted from reactive reporting to proactive enablement. Executive team uses data confidently. Recognized as the Director of Data's key thought partner on strategy."},
  ],
  mustHave:["8+ years in analytics, data, or a related technical role","Advanced SQL proficiency with complex, messy datasets","Strong experience designing analytical data models and defining metrics at scale","Experience with BigQuery, Snowflake, or Redshift","Systems-thinking mindset — foundations, not just outputs","Ownership mentality: concept through durable implementation","Deep alignment with Cartwheel's mission"],
  niceToHave:["Healthcare, mental health, or EdTech domain experience","Early-stage or high-growth startup experience","Experimentation, causal analysis, or statistical tools (Python, R)","Analytics engineering tooling (dbt, data governance frameworks)"],
  whatYoullDo:[
    {label:"Data Architecture & System Design",bullets:["Design and evolve core analytical data models","Establish standards for metrics, transformations, and semantic layers","Define best practices for analytics quality, scalability, and maintainability","Partner with data engineering and product to ensure foundations scale"]},
    {label:"Technical Leadership & Thought Partnership",bullets:["Serve as senior thought partner to the Director of Data","Provide architectural guidance across the data team","Set the bar for great analytics work at Cartwheel","Support evolution from ad-hoc analysis to productized solutions"]},
    {label:"Analytics Enablement & Decision Support",bullets:["Build and support self-service analytics and executive-ready reporting","Ensure new launches are instrumented with clear success metrics from Day 1","Improve measurement of outcomes: access to care, conversion, retention, efficiency","Support experimentation across R&D, Marketing, and Operations"]},
    {label:"Data Governance & Quality",bullets:["Champion data quality through testing, monitoring, and governance","Ensure analytical workflows are reproducible, well-documented, and resilient","Contribute to data dictionaries, metric definitions, and shared documentation"]},
  ],
  aboutRole:"The Principal Data Analyst is a senior, high-impact individual contributor role responsible for shaping Cartwheel's analytics and data foundation. This role goes beyond traditional analysis and reporting, with a strong emphasis on data system design, analytical architecture, and defining best practices for how data is modeled, measured, and delivered.\n\nYou will function as a staff-level technical leader on the data team — a close thought partner to the Director of Data — helping define what great looks like from a technical and analytical foundation perspective.",
  compBenefits:"$170,000-$210,000 cash compensation plus competitive equity. Full benefits including PPO medical/vision/dental/orthodontia, paid parental leave, 401K with 2% employer match, generous PTO, $500 learning stipend, MacBook, and annual in-person retreat.",
  stagePrepData:[
    {stage:"Recruiter Screen",prep:["Research Cartwheel's mission and school-based model","Prepare your 2-minute background summary","Know your comp expectations ($170K-$210K range)","Think about why mission-driven work matters to you"],questions:["What does success look like in the first 90 days?","How does the data team collaborate with Product and Clinical?","What is the biggest data challenge Cartwheel is working through?"]},
    {stage:"Hiring Manager Interview",prep:["Prepare 1-2 analytics framework examples with full context","Walk through: context, approach, tradeoffs, validation, impact","Think about how you have moved teams from ad-hoc to productized solutions","This is NOT a deep technical test — clarity of thinking matters most"],questions:["What are the 2-3 most important things to accomplish in year one?","How do you see the analytics team evolving over the next 12-18 months?","What does great thought partnership look like day-to-day?"]},
    {stage:"Take-Home Exercise",prep:["Block 90 uninterrupted minutes","Read all questions before starting","Write clean SQL with comments to show your thinking","Lead the proposal with metrics that matter most"],questions:["Who should I email with questions? (jacob.savos@cartwheelcare.org)","Is there a preferred format — memo or slides?"]},
    {stage:"Technical Panel",prep:["Prepare a tight 3-minute take-home recap","Be ready to discuss SQL efficiency and alternatives","Think through how you would catch data quality issues","Prepare dashboard design thinking for a new service line"],questions:["What does the current data quality monitoring process look like?","How does the team handle discrepancies between data sources?","What does the analytics tooling stack look like end-to-end?"]},
    {stage:"Business Acumen",prep:["Practice walking through problems out loud","Brush up on metric decomposition","Ask clarifying questions before jumping to answers","Propose next steps, not just diagnoses"],questions:["What business problems is the data team most focused on?","How does data inform go-to-market or expansion decisions?","What does the relationship between data and clinical look like?"]},
    {stage:"Exec Review",prep:["Prepare your long-term vision for data at Cartwheel","Know why Cartwheel specifically — mission alignment will come up","Have a thoughtful answer for where do you want to be in 3 years","Prepare 2-3 strong strategic questions"],questions:["How does the exec team use data today, and how would you like that to evolve?","What is Cartwheel's biggest strategic bet over the next 2 years?","How does data infrastructure factor into the growth roadmap?"]},
  ],
  checklist:[
    {stage:"Before Recruiter Screen",items:["Research Cartwheel's mission and school-based model","Prepare your 2-minute background summary","Know your comp expectations","Review the job description"]},
    {stage:"Before HM Interview",items:["Prepare 2 analytics framework examples","Practice walking through tradeoffs out loud","Review Cartwheel's clinical model","Prepare 3-4 thoughtful questions for Jacob"]},
    {stage:"Before Take-Home",items:["Block 90 uninterrupted minutes","Re-read all questions before starting","Prepare a clean memo or slide deck template","Plan to submit within one week"]},
    {stage:"Before Technical Panel",items:["Prepare a 3-min take-home recap","Review your SQL for efficiency improvements","Think through your data integrity approach","Prepare dashboard design thinking"]},
    {stage:"Before Business Acumen",items:["Practice metric decomposition out loud","Prepare to ask clarifying questions","Review Cartwheel's business model","Think about how data enables go-to-market decisions"]},
    {stage:"Before Exec Review",items:["Prepare your long-term vision for data at Cartwheel","Sharpen your why Cartwheel answer","Prepare 2-3 strategic questions for Daniel","Reflect on what excites you most about the mission"]},
  ],
  interviewers:[
    {label:"Recruiter Screen",name:"Caroline Colpini",title:"Talent Acquisition",href:"https://www.linkedin.com/in/caroline-colpini-154b27b4/"},
    {label:"Hiring Manager",name:"Jacob Savos",title:"Director of Data",href:"https://www.linkedin.com/in/jacob-savos/"},
    {label:"Technical Panel",name:"Nicholas Franchetti",title:"",href:"https://www.linkedin.com/in/nfranchetti/"},
    {label:"Business Acumen",name:"Sam Blumpkin + Sam Bilow",title:"",href:null,hrefs:["https://www.linkedin.com/in/samblumkin/","https://www.linkedin.com/in/sam-bilow-59434150/"]},
    {label:"Exec Review",name:"Daniel Ilkovich",title:"CTO",href:"https://www.linkedin.com/in/ilkovich/"},
  ],
  links:{cartwheel:"https://www.cartwheel.org",wallOfLove:"https://www.cartwheel.org/wall-of-love",glassdoor:"https://www.glassdoor.com/Overview/Working-at-Cartwheel-MA-EI_IE9563214.11,23.htm",linkedin:"https://www.linkedin.com/company/cartwheelcare/posts/?feedView=all"},
};

const SPM_ROLE = {
  title:"Senior Product Manager, AI Products", slug:"senior-product-manager-ai",
  department:"R&D", reportsto:"Sarah Turrin, Chief Product Officer",
  location:"Boston or Chicago preferred, Remote-friendly", employment:"Full-Time, W2", comp:"$120,000 - $170,000",
  mission:"Build the AI-enabled tools that transform how schools and clinicians deliver mental health care — translating messy, real-world workflows into software that actually works for the people using it every day.",
  stats:[{n:"350+",label:"School Districts",sub:"Serving 2.5% of U.S. districts"},{n:"$20M",label:"in ARR",sub:"Achieved in just 3 years"},{n:"300%",label:"YoY Growth",sub:"Capital-efficient scale"},{n:"1.5M",label:"Students",sub:"Enrolled across districts"}],
  team:["Sarah Turrin — Chief Product Officer (your hiring manager)","Product Design (workflow design, prototyping)","Engineering (system behaviors, edge cases, scalability)","School staff and end users (direct user research and validation)","Executive leadership (product direction and tradeoffs)"],
  stages:[
    {stage:"Recruiter Screen",time:"30m",who:"Caroline Colpini",focus:"Role fit, values, compensation alignment"},
    {stage:"Product Judgment",time:"60m",who:"Sarah Turrin, CPO",focus:"Ambiguous problem-solving, 0 to 1 ownership, AI product perspective"},
    {stage:"Technical Design",time:"60m",who:"Danielle Hawthorne, Henry Lyford, Sandip Subedi",focus:"Workflow translation, cross-functional tradeoffs, AI trust and safety"},
    {stage:"User-Centered Discovery",time:"60m",who:"Julie Jungman, Allie Pashi, Sarah Shoff, GG Guitart, Rebecca Rae Allen",focus:"User research approach, synthesizing feedback, building trust with users"},
    {stage:"Live Product Case",time:"60m",who:"Sarah Turrin, Daniel Ilkovich, Dan Tartakovsky, Sam Bilow",focus:"Problem framing, MVP definition, structured reasoning under ambiguity"},
    {stage:"Executive Review",time:"30m",who:"Joe English, CEO",focus:"Mission alignment, growth mindset, long-term values fit"},
  ],
  contacts:["Recruiter: Caroline Colpini — caroline.colpini@cartwheelcare.org","Coordinator: Avery Henry — avery.henry@cartwheelcare.org"],
  prep:["Bring 1-2 examples of products you have personally owned end-to-end","Focus on how you think, not just what shipped — tradeoffs, decisions, learnings","Be ready to discuss your honest perspective on AI's real-world usefulness and limits","Be your authentic self — this is a working session, not a test"],
  thrive:["Enjoy ambiguity and shaping problems from scratch","Are comfortable balancing speed, quality, and scalability","Like spending time with real users in real environments","Prefer influence and ownership over formal authority","Build and use AI tools as part of your everyday workflow"],
  notfor:["Require highly defined requirements or rigid processes","Avoid direct customer interaction or rely on secondhand insights","Are uncomfortable making tradeoffs with incomplete data","Over-index on strategy decks without shipping or validating quickly","Add heavyweight process instead of enabling fast learning"],
  success:[
    {period:"First 90 Days",desc:"Deeply understand school and care team workflows; conduct in-person user research; define problem statements and MVP scopes; ship at least one validated prototype."},
    {period:"First 6 Months",desc:"Launch initial AI-enabled product capability with active customer usage; establish clear success metrics; iterate based on qualitative and quantitative feedback."},
    {period:"First 12 Months",desc:"Own a portfolio of 0 to 1 initiatives with sustained adoption; demonstrate measurable workflow efficiency gains; help establish lightweight product practices across the org."},
  ],
  mustHave:["7+ years of Product Management experience with clear 0 to 1 ownership","Demonstrated experience building or prototyping AI-enabled products","Comfort with workflow-heavy, operational tools (healthcare, education, GovTech)","Strong product judgment under ambiguity and incomplete data","Proven ability to work directly with customers and conduct user research","Ability to operate as a senior IC who influences direction","Strong written and verbal communication skills"],
  niceToHave:["Experience with AI-native patterns (copilots, workflow automation, decision support)","Background in regulated domains (healthcare, education)","Familiarity with low-code or no-code tools","Experience building internal tools that later became customer-facing","Startup or early-stage company experience"],
  whatYoullDo:[
    {label:"0 to 1 AI Product Development",bullets:["Lead development of new AI-enabled SaaS tools from early concept through initial adoption","Partner with Design and Engineering to shape workflows, MVPs, and system behaviors","Use AI prototyping tools to accelerate discovery, experimentation, and iteration","Make pragmatic tradeoffs between speed, quality, and scalability"]},
    {label:"Workflow Translation and Product Design",bullets:["Spend time directly with school staff to understand real-world workflows","Translate messy, real-world problems into clear product abstractions","Design products focused on workflow automation and decision-support","Build products that balance speed with safety, trust, and usability"]},
    {label:"Discovery, Metrics and Iteration",bullets:["Define success metrics and use qualitative and quantitative feedback to guide iteration","Conduct sustained, in-person user research with school staff and care teams","Navigate conflicting signals between what users say vs. do","Know when you have learned enough to move forward"]},
    {label:"Team and Org Contribution",bullets:["Help establish lightweight product practices that enable fast learning","Collaborate with GTM teams on marketing, messaging, and how product lands in market","Operate as a senior IC who shapes direction and raises the bar for early-stage products"]},
  ],
  aboutRole:"Cartwheel is building technology that supports how mental health care is delivered, coordinated, and sustained in school settings. We are looking for a Senior Product Manager, AI Products to work on early-stage product initiatives focused on improving how complex work gets done.\n\nThis is a senior individual contributor role for someone who thrives in ambiguity, is comfortable partnering closely with customers, and enjoys shaping products from the earliest stages.",
  compBenefits:"$120,000-$170,000 base compensation plus meaningful equity. Level and comp may flex for exceptional candidates. Full benefits including PPO medical/vision/dental, paid parental leave, 401K with employer match, generous PTO, annual learning stipend, MacBook, and annual in-person retreat.",
  stagePrepData:[
    {stage:"Recruiter Screen",prep:["Research Cartwheel's mission and school-based model","Prepare your 2-minute background summary focused on 0 to 1 product work","Know your comp expectations within the $120K-$170K range","Think about why AI and mental health and education resonates with you personally"],questions:["What does success look like in the first 90 days?","How does the PM team collaborate with Engineering and Design?","What AI initiatives is Cartwheel most focused on right now?"]},
    {stage:"Product Judgment",prep:["Prepare 1-2 examples of products you have personally owned end-to-end","Focus on how you think, not just what shipped — tradeoffs, decisions, learnings","Be ready to discuss your honest perspective on AI's real-world usefulness and limits","This is a working session — think out loud, ask questions, collaborate"],questions:["What is the most important problem to solve in year one?","How does Cartwheel think about AI safety and trust in product?","What does the product development process look like today?"]},
    {stage:"Technical Design",prep:["Prepare examples of how you have handled cross-functional tension","Practice translating a messy workflow into a product concept out loud","Think through how you would handle an AI edge case involving student data","There may be a lightweight live exercise — focus on clarity over perfection"],questions:["How do Engineering and Design collaborate on early-stage initiatives?","What is the biggest technical constraint on AI product development right now?","How do you handle edge cases in workflows involving sensitive student data?"]},
    {stage:"User-Centered Discovery",prep:["Prepare 2 examples where user research changed your direction","Think through your approach to building trust with overwhelmed users","Review Cartwheel's school and clinical user types","Prepare questions about the current user research process"],questions:["How do school staff currently experience the Cartwheel product?","What is the hardest user research challenge in school-based mental health?","How do care teams and school staff interact differently with the product?"]},
    {stage:"Live Product Case",prep:["No slides needed — practice structured thinking out loud","Focus on framing the problem, identifying constraints, defining a reasonable MVP","Practice staying calm and collaborative when working through ambiguity","Prepare 1-2 clarifying questions to ask before diving in"],questions:["What is the most important constraint I should keep in mind?","How would you want this type of thinking applied on the job?"]},
    {stage:"Executive Review",prep:["Prepare your why Cartwheel answer — mission alignment will be central","Have a thoughtful answer for how you reflect on mistakes and growth","Prepare 2-3 strategic questions about where Cartwheel is headed","This is a two-way conversation — Joe expects you to interview him too"],questions:["What is the biggest strategic bet Cartwheel is making over the next 2 years?","How do you think about AI's role in Cartwheel's long-term competitive position?","What does the culture look like as the company scales past 200 people?"]},
  ],
  checklist:[
    {stage:"Before Recruiter Screen",items:["Research Cartwheel's mission and school-based model","Prepare your 2-minute background summary","Know your comp expectations","Review the job description"]},
    {stage:"Before Product Judgment Round",items:["Prepare 2 end-to-end product examples with full context","Articulate the tradeoffs you made and what you learned","Prepare your honest perspective on AI's real-world usefulness","Review Cartwheel's product and clinical model"]},
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

const QUALITIES = [
  {label:"Human",desc:"Bringing warmth + compassion"},
  {label:"Humble",desc:"Preferring learning to being right"},
  {label:"Accountable",desc:"Owning mistakes + delivering"},
  {label:"Innovative",desc:"Pushing for improvement"},
  {label:"Resilient",desc:"Supporting each other through challenges"},
];

function InterviewerList({role}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {(role.interviewers||[]).map((p,i)=>(
        <div key={i} style={{display:"flex",gap:9,alignItems:"flex-start"}}>
          <CWBullet color={C.lavender} size={12}/>
          <span style={{fontSize:14,color:"#444",lineHeight:1.6}}>
            <span style={{fontWeight:600}}>{p.label}:</span>{" "}
            {p.multiHrefs
              ? p.multiHrefs.map((m,j)=><span key={j}>{j>0?", ":""}<ExtLink href={m.href}>{m.name}</ExtLink></span>)
              : p.hrefs
                ? <><ExtLink href={p.hrefs[0]}>Sam Blumpkin</ExtLink> + <ExtLink href={p.hrefs[1]}>Sam Bilow</ExtLink></>
                : p.href ? <ExtLink href={p.href}>{p.name}</ExtLink> : <span>{p.name}</span>
            }
            {p.title ? `, ${p.title}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function ContactList({role}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {[
        {label:"Recruiter",name:"Caroline Colpini",href:"mailto:caroline.colpini@cartwheelcare.org"},
        {label:"Coordinator",name:"Avery Henry",href:"mailto:avery.henry@cartwheelcare.org"},
      ].map(({label,name,href})=>(
        <div key={label} style={{display:"flex",gap:9,alignItems:"flex-start"}}>
          <CWBullet color={C.forest} size={12}/>
          <span style={{fontSize:13,color:C.charcoal,lineHeight:1.6}}>
            <span style={{fontWeight:600}}>{label}:</span> <ExtLink href={href}>{name}</ExtLink>
          </span>
        </div>
      ))}
    </div>
  );
}

function StageWhoDisplay({interviewer}) {
  if(interviewer.multiHrefs) return <span>{interviewer.multiHrefs.map((m,j)=><span key={j}>{j>0?", ":""}<ExtLink href={m.href}>{m.name}</ExtLink></span>)}</span>;
  if(interviewer.hrefs) return <><ExtLink href={interviewer.hrefs[0]}>Sam Blumpkin</ExtLink> + <ExtLink href={interviewer.hrefs[1]}>Sam Bilow</ExtLink></>;
  return interviewer.href ? <ExtLink href={interviewer.href}>{interviewer.name}</ExtLink> : <span>{interviewer.name}</span>;
}

function PrepChecklist({role}) {
  const [checked,setChecked] = useState({});
  const [openStage,setOpenStage] = useState(0);
  const toggle=(si,ii)=>{const k=`${si}-${ii}`;setChecked(p=>({...p,[k]:!p[k]}));};
  const progress=(si)=>{const items=(role.checklist||[])[si]?.items||[];return{done:items.filter((_,i)=>checked[`${si}-${i}`]).length,total:items.length};};
  const totalDone=Object.values(checked).filter(Boolean).length;
  const totalItems=(role.checklist||[]).reduce((a,s)=>a+(s.items?.length||0),0);
  const pct=totalItems?Math.round((totalDone/totalItems)*100):0;
  return (
    <div>
      <div style={{background:C.lightLavender,borderRadius:10,padding:"16px 20px",marginBottom:20,display:"flex",alignItems:"center",gap:16}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:13,color:C.indigo,marginBottom:6}}>Overall Preparation</div>
          <div style={{background:"#c5bef5",borderRadius:99,height:8,overflow:"hidden"}}>
            <div style={{height:"100%",background:C.indigo,borderRadius:99,width:`${pct}%`,transition:"width 0.3s"}}/>
          </div>
        </div>
        <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:22,color:C.indigo,minWidth:48,textAlign:"right"}}>{pct}%</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {(role.checklist||[]).map((section,si)=>{
          const{done,total}=progress(si);const isOpen=openStage===si;const complete=done===total;
          return(
            <div key={si} style={{border:`1px solid ${isOpen?C.lavender:"#e2ddd8"}`,borderRadius:8,overflow:"hidden",background:complete?"#f8fff8":C.white}}>
              <button onClick={()=>setOpenStage(isOpen?null:si)} style={{width:"100%",padding:"13px 16px",background:"none",border:"none",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",textAlign:"left",gap:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:complete?C.forest:C.lightLavender,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {complete?<span style={{color:C.white,fontSize:13,fontWeight:700}}>✓</span>:<span style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,fontWeight:700,color:C.indigo}}>{si+1}</span>}
                  </div>
                  <span style={{fontWeight:600,fontSize:14,color:C.charcoal}}>{section.stage}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:12,color:C.taupe}}>{done}/{total}</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{flexShrink:0,transform:isOpen?"rotate(180deg)":"none",transition:"0.2s"}}>
                    <path d="M2 5l5 5 5-5" stroke={C.indigo} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>
              {isOpen&&(
                <div style={{padding:"4px 16px 16px",borderTop:`1px solid ${C.lightLavender}`}}>
                  {(section.items||[]).map((item,ii)=>{
                    const k=`${si}-${ii}`;const isChecked=!!checked[k];
                    return(
                      <div key={ii} onClick={()=>toggle(si,ii)} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"8px 0",cursor:"pointer",borderBottom:ii<(section.items.length-1)?`1px solid #f5f2ef`:"none"}}>
                        <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${isChecked?C.forest:"#ccc"}`,background:isChecked?C.forest:C.white,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1,transition:"all 0.15s"}}>
                          {isChecked&&<span style={{color:C.white,fontSize:12,fontWeight:700,lineHeight:1}}>✓</span>}
                        </div>
                        <span style={{fontSize:14,color:isChecked?C.taupe:C.charcoal,lineHeight:1.5,textDecoration:isChecked?"line-through":"none",transition:"all 0.15s"}}>{item}</span>
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

function StagePrep({role}) {
  const [open,setOpen]=useState(null);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {(role.stages||[]).map((stage,i)=>{
        const pd=(role.stagePrepData||[])[i]||{prep:[],questions:[]};
        const interviewer=(role.interviewers||[])[i];
        const isOpen=open===i;
        return(
          <div key={i} style={{border:`1px solid ${isOpen?C.lavender:"#e2ddd8"}`,borderRadius:10,overflow:"hidden",background:isOpen?"#fdfcff":C.white}}>
            <button onClick={()=>setOpen(isOpen?null:i)} style={{width:"100%",padding:"14px 18px",background:"none",border:"none",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",textAlign:"left",gap:14}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{background:isOpen?C.indigo:C.lightLavender,borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,color:isOpen?C.white:C.indigo,whiteSpace:"nowrap",transition:"all 0.15s"}}>{stage.time}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:C.charcoal}}>{stage.stage}</div>
                  <div style={{fontSize:12,color:C.taupe,marginTop:1}}>{interviewer?<StageWhoDisplay interviewer={interviewer}/>:<span>{stage.who}</span>}</div>
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{flexShrink:0,transform:isOpen?"rotate(180deg)":"none",transition:"0.2s"}}>
                <path d="M2 5l5 5 5-5" stroke={C.indigo} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {isOpen&&(
              <div style={{padding:"0 18px 18px",borderTop:`1px solid ${C.lightLavender}`}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:14}}>
                  <div>
                    <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:11,letterSpacing:"0.8px",textTransform:"uppercase",color:C.forest,marginBottom:10}}>How to Prepare</div>
                    <div style={{display:"flex",flexDirection:"column",gap:7}}>
                      {pd.prep.map((tip,j)=>(
                        <div key={j} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                          <CWBullet color={C.lavender} size={11}/>
                          <span style={{fontSize:13,color:"#444",lineHeight:1.55}}>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{background:C.sand,borderRadius:8,padding:"14px"}}>
                    <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:11,letterSpacing:"0.8px",textTransform:"uppercase",color:C.forest,marginBottom:10}}>Questions to Ask</div>
                    <div style={{display:"flex",flexDirection:"column",gap:7}}>
                      {pd.questions.map((q,j)=>(
                        <div key={j} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                          <DiamondShape color={C.forest} size={11}/>
                          <span style={{fontSize:13,color:C.charcoal,lineHeight:1.55,fontStyle:"italic"}}>"{q}"</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CandidateView({role,onBack}) {
  const [tab,setTab]=useState("guide");
  const [open,setOpen]=useState(null);
  const [msgs,setMsgs]=useState([{role:"assistant",content:`Hi! I am here to help you navigate your interview for ${role.title} at Cartwheel. Ask me anything about the role, the process, or how to prepare.`}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading]);

  const CHAT_SYSTEM=`You are a warm, helpful candidate experience assistant for Cartwheel. Help candidates interviewing for ${role.title} understand the process and what to expect. Be friendly, concise, and encouraging. Cartwheel values: Human, Humble, Accountable, Innovative, Resilient.
ROLE: ${role.title} | Reports to ${role.reportsto} | ${role.location} | ${role.comp} | Senior IC, no direct reports.
STAGES: ${(role.stages||[]).map(s=>`${s.stage} (${s.time}) with ${s.who} - ${s.focus}`).join("; ")}
CONTACTS: Caroline Colpini (caroline.colpini@cartwheelcare.org) - recruiter. Avery Henry (avery.henry@cartwheelcare.org) - coordinator.
PREP: ${(role.prep||[]).join("; ")}
COMPANY: Series B, Menlo/Reach/General Catalyst. Largest K-12 mental health telehealth provider in US. 58% full remission; 3x depression reduction; 92% families recommend.
BENEFITS: PPO medical/vision/dental, paid parental leave, 401K+2% match, $500 stipend, MacBook, equity, remote + annual retreat.
Only answer from this info. If unsure, direct to Avery Henry (avery.henry@cartwheelcare.org).`;

  const send=async(text)=>{
    const q=(text||input).trim();if(!q)return;
    setInput("");
    const updated=[...msgs,{role:"user",content:q}];
    setMsgs(updated);setLoading(true);
    try{
      const reply=await callClaude(CHAT_SYSTEM,updated.slice(1).map(m=>({role:m.role,content:m.content})),800);
      setMsgs(p=>[...p,{role:"assistant",content:reply||"Something went wrong — please reach out to Avery at avery.henry@cartwheelcare.org."}]);
    }catch(e){
      setMsgs(p=>[...p,{role:"assistant",content:"Something went wrong — please reach out to Avery at avery.henry@cartwheelcare.org."}]);
    }
    setLoading(false);
  };

  const TABS=[["guide","FAQ"],["chat","Ask a Question"],["roadmap","Roadmap"],["prep","Interview Prep"],["checklist","Checklist"],["jd","Job Description"]];
  const toggle=(k)=>setOpen(open===k?null:k);
  const links=role.links||{};

  const FAQ_SECTIONS=[
    {title:"The Interview Process",items:[
      {q:"How many rounds are there?",type:"text",a:`${(role.stages||[]).length} stages: ${(role.stages||[]).map(s=>s.stage).join(", ")}. Not every candidate moves through every stage — we will always share next steps transparently.`},
      {q:"How long does the full process take?",type:"text",a:"We move as quickly as mutual fit and scheduling allow. If you have a competing offer or timeline, let your recruiter know."},
    ]},
    {title:"Who You'll Meet",items:[
      {q:"Who are my interviewers?",type:"custom",render:()=><InterviewerList role={role}/>},
      {q:"Who should I contact with questions?",type:"custom",render:()=><ContactList role={role}/>},
    ]},
    {title:"The Role",items:[
      {q:"What's the compensation?",type:"text",a:`${role.comp} plus competitive equity. You will discuss where you see yourself in that range during your recruiter screen.`},
      {q:"What does success look like?",type:"bullets",items:(role.success||[]).map(s=>`${s.period}: ${s.desc}`)},
    ]},
    {title:"Life at Cartwheel",items:[
      {q:"What is Cartwheel's mission?",type:"text",a:"We partner with K-12 schools to provide accessible mental health care to students — enabling earlier intervention, higher engagement, and better-coordinated care. 58% of students achieve full remission of anxiety; 92% of families recommend us to a peer."},
      {q:"What are the benefits?",type:"bullets",items:["PPO medical, vision, dental, and orthodontia","Paid parental leave","401K with 2% employer match","Generous PTO + company closure Dec 25-Jan 1","$500 annual learning stipend","MacBook provided","Meaningful equity","Remote-friendly with annual in-person retreat"]},
    ]},
  ];

  return(
    <div style={{fontFamily:"'Inter',sans-serif",minHeight:"100vh",background:C.white,color:C.charcoal}}>
      <div style={{background:C.sand,borderBottom:`1px solid #ddd7d1`,padding:"14px 28px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <Wordmark/>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{fontSize:12,color:C.taupe,fontStyle:"italic"}}>Candidate Information Packet</div>
          {onBack&&<button onClick={onBack} style={{fontSize:11,color:C.taupe,background:"none",border:`1px solid #e2ddd8`,borderRadius:6,padding:"3px 10px",cursor:"pointer"}}>Admin</button>}
        </div>
      </div>

      <div style={{background:C.white,padding:"28px 28px 0",borderBottom:`1px solid #e2ddd8`}}>
        <div style={{maxWidth:820,margin:"0 auto"}}>
          <h1 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:28,color:C.charcoal,margin:"0 0 4px"}}>{role.title}</h1>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontStyle:"italic",fontSize:14,color:C.indigo,marginBottom:12}}>Candidate Information Packet</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"3px 24px",marginBottom:16}}>
            {[["Department",role.department],["Reports To",role.reportsto],["Location",role.location],["Employment",role.employment]].map(([k,v])=>(
              <div key={k} style={{fontSize:13}}><span style={{fontWeight:700}}>{k}:</span> {v}</div>
            ))}
          </div>
          <div style={{borderTop:`1px solid #e2ddd8`,borderBottom:`1px solid #e2ddd8`,borderLeft:`4px solid ${C.forest}`,padding:"14px 0 14px 16px",margin:"0 0 20px"}}>
            <p style={{fontSize:15,color:C.charcoal,lineHeight:1.7,margin:0,fontStyle:"italic"}}>{role.mission}</p>
          </div>
          <div style={{marginBottom:20}}>
            <SectionHead>At a Glance</SectionHead>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {(role.stats||[]).map(({n,label,sub})=>(
                <div key={n} style={{background:C.lightLavender,borderRadius:8,padding:"14px"}}>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:22,color:C.indigo}}>{n}</div>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,color:C.indigo,marginTop:3}}>{label}</div>
                  <div style={{fontSize:11,color:C.indigo,marginTop:3,opacity:.75}}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",borderTop:`1px solid #e2ddd8`,overflowX:"auto"}}>
            {TABS.map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id)} style={{padding:"12px 14px",border:"none",background:"none",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,color:tab===id?C.indigo:C.taupe,borderBottom:tab===id?`3px solid ${C.indigo}`:"3px solid transparent",transition:"all 0.15s"}}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:820,margin:"0 auto",padding:"28px 28px 48px"}}>
        {tab==="guide"&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:32}}>
              <div style={{background:C.forest,borderRadius:10,padding:"20px"}}>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:500,fontSize:16,color:C.white,marginBottom:14}}>What Qualities Do We Look For?</div>
                {QUALITIES.map(q=>(
                  <div key={q.label} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
                    <DiamondShape color={C.mint} size={13}/>
                    <div style={{fontSize:13,color:C.white,lineHeight:1.5}}><span style={{fontWeight:700}}>{q.label}:</span> {q.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{background:C.sand,borderRadius:10,padding:"20px"}}>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:500,fontSize:16,color:C.charcoal,marginBottom:14}}>How to Reach Us</div>
                <ContactList role={role}/>
              </div>
            </div>
            {FAQ_SECTIONS.map((sec,si)=>(
              <div key={sec.title} style={{marginBottom:28}}>
                <SectionHead>{sec.title}</SectionHead>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {sec.items.map((item,i)=>{
                    const k=`${si}-${i}`,isOpen=open===k;
                    return(
                      <div key={k} style={{border:`1px solid ${isOpen?C.lavender:"#e2ddd8"}`,borderRadius:8,background:isOpen?"#fdfcff":C.white,overflow:"hidden",transition:"all 0.15s"}}>
                        <button onClick={()=>toggle(k)} style={{width:"100%",padding:"13px 16px",background:"none",border:"none",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",textAlign:"left",gap:14}}>
                          <span style={{fontWeight:600,fontSize:14,color:C.charcoal,lineHeight:1.4}}>{item.q}</span>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{flexShrink:0,transform:isOpen?"rotate(180deg)":"none",transition:"0.2s"}}>
                            <path d="M2 5l5 5 5-5" stroke={C.indigo} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        {isOpen&&(
                          <div style={{padding:"12px 16px 16px",borderTop:`1px solid ${C.lightLavender}`}}>
                            {item.type==="custom"?item.render():item.type==="bullets"?<BulletList items={item.items} color={C.lavender}/>:<p style={{fontSize:14,color:"#444",lineHeight:1.75,margin:0}}>{item.a}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {Object.values(links).some(Boolean)&&(
              <div style={{background:C.sand,borderRadius:12,padding:"20px 24px",marginBottom:28}}>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:13,color:C.charcoal,marginBottom:14}}>Learn more about Cartwheel</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                  {[["Cartwheel.org",links.cartwheel],["Wall of Love",links.wallOfLove],["Glassdoor",links.glassdoor],["LinkedIn",links.linkedin]].filter(([,h])=>h).map(([label,href])=>(
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,background:C.white,border:`1px solid #e2ddd8`,borderRadius:20,padding:"8px 16px",fontSize:13,color:C.charcoal,textDecoration:"none",fontWeight:500}}>{label}</a>
                  ))}
                </div>
              </div>
            )}
            <Footer label="Candidate Guide"/>
          </>
        )}

        {tab==="chat"&&(
          <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 380px)",minHeight:400}}>
            <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:14,paddingBottom:16}}>
              {msgs.map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",alignItems:"flex-end",gap:10}}>
                  {m.role==="assistant"&&<div style={{width:32,height:32,borderRadius:6,background:C.charcoal,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><WheelMark size={20}/></div>}
                  <div style={{maxWidth:"76%",padding:"12px 16px",borderRadius:12,background:m.role==="user"?C.indigo:C.white,color:m.role==="user"?C.white:C.charcoal,fontSize:14,lineHeight:1.7,border:m.role==="assistant"?`1px solid #e2ddd8`:"none",borderBottomRightRadius:m.role==="user"?3:12,borderBottomLeftRadius:m.role==="assistant"?3:12,whiteSpace:"pre-wrap"}}>{m.content}</div>
                </div>
              ))}
              {loading&&(
                <div style={{display:"flex",alignItems:"flex-end",gap:10}}>
                  <div style={{width:32,height:32,borderRadius:6,background:C.charcoal,display:"flex",alignItems:"center",justifyContent:"center"}}><WheelMark size={20}/></div>
                  <div style={{background:C.white,border:`1px solid #e2ddd8`,borderRadius:12,borderBottomLeftRadius:3,padding:"13px 18px",display:"flex",gap:5}}>
                    {[0,1,2].map(d=><span key={d} style={{width:7,height:7,borderRadius:"50%",background:C.lavender,display:"inline-block",animation:"blink 1.2s infinite",animationDelay:`${d*0.2}s`}}/>)}
                  </div>
                </div>
              )}
              <div ref={endRef}/>
            </div>
            {msgs.length<=1&&(
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,color:C.taupe,marginBottom:8,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase"}}>Suggested questions</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {["What should I prepare for my first interview?","Who will I be meeting with?","What does success look like in the first 90 days?","What are the benefits?"].map((q,i)=>(
                    <button key={i} onClick={()=>send(q)} style={{background:C.white,border:`1px solid #e2ddd8`,borderRadius:20,padding:"8px 14px",fontSize:13,color:C.charcoal,cursor:"pointer",fontWeight:500,display:"flex",alignItems:"center",gap:6}}>
                      <CWBullet color={C.lavender} size={11}/>{q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{display:"flex",gap:10,background:C.white,borderRadius:10,border:`1px solid #e2ddd8`,padding:"10px 12px"}}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Ask anything about the interview process..." style={{flex:1,border:"none",outline:"none",fontSize:14,color:C.charcoal,background:"transparent",fontFamily:"inherit"}}/>
              <button onClick={()=>send()} disabled={!input.trim()||loading} style={{background:input.trim()&&!loading?C.indigo:"#e2ddd8",color:C.white,border:"none",borderRadius:7,padding:"9px 18px",fontSize:12,fontFamily:"'Montserrat',sans-serif",fontWeight:700,cursor:input.trim()&&!loading?"pointer":"default",transition:"background 0.2s"}}>Send</button>
            </div>
          </div>
        )}

        {tab==="roadmap"&&(
          <>
            <SectionHead>Interview Roadmap | {role.title}</SectionHead>
            <p style={{fontSize:14,color:C.charcoal,lineHeight:1.7,margin:"0 0 20px"}}>Our goal is to make this process feel <strong>supportive</strong>, <strong>transparent</strong>, and true to the values we bring to our work every day.</p>
            <div style={{borderRadius:10,overflow:"hidden",border:`1px solid #e2ddd8`,marginBottom:28}}>
              <div style={{display:"grid",gridTemplateColumns:"2fr 0.6fr 2fr 2.5fr",background:C.forest}}>
                {["STAGE","TIME","INTERVIEWERS","FOCUS"].map(h=><div key={h} style={{padding:"11px 14px",fontSize:11,fontWeight:700,color:C.white,letterSpacing:"1px"}}>{h}</div>)}
              </div>
              {(role.stages||[]).map((r,i)=>{
                const interviewer=(role.interviewers||[])[i];
                return(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 0.6fr 2fr 2.5fr",background:i%2===0?C.lightMint:"#e8f4e4",borderTop:`1px solid #cde4c8`}}>
                    <div style={{padding:"12px 14px",fontSize:13,color:C.charcoal,fontWeight:600}}>{r.stage}</div>
                    <div style={{padding:"12px 14px",fontSize:13,color:C.charcoal}}>{r.time}</div>
                    <div style={{padding:"12px 14px",fontSize:13,color:C.charcoal}}>{interviewer?<StageWhoDisplay interviewer={interviewer}/>:<span>{r.who}</span>}</div>
                    <div style={{padding:"12px 14px",fontSize:13,color:C.charcoal}}>{r.focus}</div>
                  </div>
                );
              })}
            </div>
            <SectionHead>What Success Looks Like</SectionHead>
            <div style={{borderRadius:10,overflow:"hidden",border:`1px solid #e2ddd8`,marginBottom:28}}>
              {(role.success||[]).map(({period,desc},i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"160px 1fr",background:i%2===0?C.sand:C.white,borderTop:i===0?"none":`1px solid #e2ddd8`}}>
                  <div style={{padding:"16px 14px",fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:13,color:C.forest}}>{period}</div>
                  <div style={{padding:"16px 14px",fontSize:13,color:C.charcoal,lineHeight:1.65}}>{desc}</div>
                </div>
              ))}
            </div>
            <Footer label="Interview Process"/>
          </>
        )}

        {tab==="prep"&&(
          <>
            <div style={{marginBottom:32}}>
              <SectionHead>Is This Role for You?</SectionHead>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:28}}>
                <div style={{background:C.lightMint,borderRadius:10,padding:"18px"}}>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,color:C.forest,marginBottom:12,letterSpacing:"0.8px",textTransform:"uppercase"}}>You'll thrive if you...</div>
                  {(role.thrive||[]).map((t,i)=>(<div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:8,fontSize:13,color:C.charcoal,lineHeight:1.5}}><span style={{color:C.forest,fontWeight:700,flexShrink:0}}>✓</span>{t}</div>))}
                </div>
                <div style={{background:C.lightPeach,borderRadius:10,padding:"18px"}}>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,color:C.brick,marginBottom:12,letterSpacing:"0.8px",textTransform:"uppercase"}}>This isn't for you if you...</div>
                  {(role.notfor||[]).map((t,i)=>(<div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:8,fontSize:13,color:C.charcoal,lineHeight:1.5}}><span style={{color:C.brick,fontWeight:700,flexShrink:0}}>✕</span>{t}</div>))}
                </div>
              </div>
            </div>
            <div style={{marginBottom:32}}>
              <SectionHead>Stage-by-Stage Prep</SectionHead>
              <p style={{fontSize:14,color:C.taupe,margin:"0 0 16px",lineHeight:1.6}}>Click each stage for tailored prep tips and questions to ask your interviewers.</p>
              <StagePrep role={role}/>
            </div>
            <Footer label="Interview Prep"/>
          </>
        )}

        {tab==="checklist"&&(
          <>
            <SectionHead>Your Prep Checklist</SectionHead>
            <p style={{fontSize:14,color:C.taupe,margin:"0 0 20px",lineHeight:1.6}}>Work through each stage as you prepare. Your progress is saved in this browser.</p>
            <PrepChecklist role={role}/>
            <div style={{marginTop:28}}><Footer label="Checklist"/></div>
          </>
        )}

        {tab==="jd"&&(
          <>
            <SectionHead>Job Description</SectionHead>
            <div style={{display:"inline-flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
              <span style={{background:C.lightLavender,borderRadius:6,padding:"4px 12px",fontSize:12,fontWeight:700,color:C.indigo}}>{role.comp}</span>
              <span style={{background:C.sand,borderRadius:6,padding:"4px 12px",fontSize:12,fontWeight:700,color:C.forest}}>{role.location}</span>
              <span style={{background:C.sand,borderRadius:6,padding:"4px 12px",fontSize:12,fontWeight:700,color:C.forest}}>{role.employment}</span>
            </div>
            {[
              {heading:"About the Role",content:role.aboutRole},
              {heading:"What You'll Do",subsections:role.whatYoullDo},
              {heading:"Must Have",bullets:role.mustHave},
              {heading:"Nice to Have",bullets:role.niceToHave},
              {heading:"Compensation and Benefits",content:role.compBenefits},
            ].map((sec,i)=>(
              <div key={i} style={{marginBottom:28}}>
                <h3 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:15,color:C.charcoal,margin:"0 0 10px",paddingBottom:6,borderBottom:`1px solid #e2ddd8`}}>{sec.heading}</h3>
                {sec.content&&<p style={{fontSize:14,color:"#444",lineHeight:1.75,margin:0,whiteSpace:"pre-line"}}>{sec.content}</p>}
                {sec.bullets&&<BulletList items={sec.bullets} color={C.lavender}/>}
                {sec.subsections&&sec.subsections.map((sub,j)=>(
                  <div key={j} style={{marginBottom:16}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.forest,marginBottom:8}}>{sub.label}</div>
                    <BulletList items={sub.bullets} color={C.lavender}/>
                  </div>
                ))}
              </div>
            ))}
            <div style={{background:C.lightMint,borderRadius:10,padding:"16px 18px",marginBottom:28}}>
              <p style={{fontSize:14,color:C.charcoal,lineHeight:1.7,margin:0}}><strong>Please apply even if you do not meet all criteria.</strong> If your experience does not perfectly match but you bring other relevant skills, we would still love to hear from you.</p>
            </div>
            <Footer label="Job Description"/>
          </>
        )}
      </div>
    </div>
  );
}

function AdminLogin({onSuccess}) {
  const [pw,setPw]=useState("");
  const [error,setError]=useState(false);
  const attempt=()=>{if(pw===ADMIN_PASSWORD){onSuccess();}else{setError(true);setPw("");}};
  return(
    <div style={{fontFamily:"'Inter',sans-serif",minHeight:"100vh",background:C.sand,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.white,borderRadius:16,border:`1px solid #e2ddd8`,padding:"40px 36px",width:"100%",maxWidth:380,textAlign:"center"}}>
        <div style={{marginBottom:20}}><WheelMark size={44}/></div>
        <h1 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:20,color:C.charcoal,margin:"0 0 6px"}}>Admin Access</h1>
        <p style={{fontSize:13,color:C.taupe,margin:"0 0 24px"}}>Candidate Experience Platform</p>
        <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setError(false);}} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="Enter password" style={{width:"100%",padding:"11px 14px",border:`1px solid ${error?C.peach:"#e2ddd8"}`,borderRadius:8,fontSize:14,color:C.charcoal,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:8}}/>
        {error&&<p style={{fontSize:12,color:C.brick,margin:"0 0 12px"}}>Incorrect password. Please try again.</p>}
        <button onClick={attempt} style={{width:"100%",background:C.indigo,color:C.white,border:"none",borderRadius:8,padding:"11px",fontSize:13,fontFamily:"'Montserrat',sans-serif",fontWeight:700,cursor:"pointer",marginTop:error?0:8}}>Sign In</button>
      </div>
    </div>
  );
}

function AdminDashboard({allRoles,onPublish,onPreview,onDelete,onLogout}) {
  const [step,setStep]=useState("list");
  const [pasteText,setPasteText]=useState("");
  const [parsing,setParsing]=useState(false);
  const [parsed,setParsed]=useState(null);
  const [parseError,setParseError]=useState("");
  const [saving,setSaving]=useState(false);
  const [editField,setEditField]=useState(null);

  const handleParse=async()=>{
    if(!pasteText.trim())return;
    setParsing(true);setParseError("");
    try{
      const raw=await callClaude(PARSE_SYSTEM,[{role:"user",content:pasteText}],3000);
      const clean=raw.replace(/```json|```/g,"").trim();
      setParsed(JSON.parse(clean));setStep("review");
    }catch(e){setParseError("Couldn't parse the hiring package. Please check the content and try again.");}
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

  const getLink=(slug)=>`${window.location.origin}?role=${slug}`;

  return(
    <div style={{fontFamily:"'Inter',sans-serif",minHeight:"100vh",background:"#f5f4f2",color:C.charcoal}}>
      <div style={{background:C.charcoal,padding:"14px 28px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <Wordmark light/>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{fontSize:12,color:"#8a9ba8",fontStyle:"italic"}}>Admin - Candidate Experience Platform</div>
          <button onClick={onLogout} style={{fontSize:11,color:"#8a9ba8",background:"none",border:`1px solid #3a4a52`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>Log out</button>
        </div>
      </div>
      <div style={{maxWidth:860,margin:"0 auto",padding:"32px 24px"}}>
        {step==="list"&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,flexWrap:"wrap",gap:12}}>
              <div>
                <h1 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:22,color:C.charcoal,margin:"0 0 4px"}}>Active Roles</h1>
                <p style={{fontSize:14,color:C.taupe,margin:0}}>{allRoles.length} role{allRoles.length!==1?"s":""} published</p>
              </div>
              <button onClick={()=>setStep("paste")} style={{background:C.indigo,color:C.white,border:"none",borderRadius:8,padding:"11px 20px",fontSize:13,fontFamily:"'Montserrat',sans-serif",fontWeight:700,cursor:"pointer"}}>+ Add New Role</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {allRoles.map(role=>(
                <div key={role.slug} style={{background:C.white,borderRadius:12,border:`1px solid #e2ddd8`,padding:"18px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
                  <div>
                    <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:16,color:C.charcoal,marginBottom:3}}>{role.title}</div>
                    <div style={{fontSize:13,color:C.taupe}}>{role.department} - {role.location} - {role.comp}</div>
                    <div style={{fontSize:12,color:C.indigo,marginTop:6,fontFamily:"monospace",background:C.lightLavender,padding:"2px 8px",borderRadius:4,display:"inline-block"}}>?role={role.slug}</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>onPreview(role)} style={{background:C.indigo,color:C.white,border:"none",borderRadius:7,padding:"8px 16px",fontSize:12,fontFamily:"'Montserrat',sans-serif",fontWeight:700,cursor:"pointer"}}>Preview</button>
                    <button onClick={()=>{try{navigator.clipboard.writeText(getLink(role.slug));}catch(e){}}} style={{background:C.lightLavender,color:C.indigo,border:"none",borderRadius:7,padding:"8px 16px",fontSize:12,fontFamily:"'Montserrat',sans-serif",fontWeight:700,cursor:"pointer"}}>Copy Link</button>
                    {!BUILT_IN_ROLES.find(r=>r.slug===role.slug)&&<button onClick={()=>onDelete(role.slug)} style={{background:C.lightPeach,color:C.brick,border:"none",borderRadius:7,padding:"8px 16px",fontSize:12,fontFamily:"'Montserrat',sans-serif",fontWeight:700,cursor:"pointer"}}>Delete</button>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {step==="paste"&&(
          <>
            <button onClick={()=>setStep("list")} style={{background:"none",border:"none",color:C.indigo,fontSize:13,fontWeight:700,cursor:"pointer",padding:"0 0 20px",fontFamily:"'Montserrat',sans-serif"}}>Back to roles</button>
            <h1 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:22,color:C.charcoal,margin:"0 0 8px"}}>Add New Role</h1>
            <p style={{fontSize:14,color:C.taupe,margin:"0 0 24px",lineHeight:1.6}}>Paste your hiring package below. Claude will extract all structured data and populate the candidate experience page automatically.</p>
            <div style={{background:C.white,borderRadius:12,border:`1px solid #e2ddd8`,overflow:"hidden",marginBottom:16}}>
              <div style={{padding:"12px 16px",background:C.sand,borderBottom:`1px solid #e2ddd8`,fontSize:12,fontWeight:700,color:C.taupe,letterSpacing:"1px",textTransform:"uppercase"}}>Hiring Package Content</div>
              <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} placeholder="Paste your full hiring package here..." style={{width:"100%",minHeight:320,padding:"16px",border:"none",outline:"none",fontSize:14,lineHeight:1.7,color:C.charcoal,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
            </div>
            {parseError&&<div style={{background:C.lightPeach,borderRadius:8,padding:"12px 16px",fontSize:13,color:C.brick,marginBottom:16}}>{parseError}</div>}
            <button onClick={handleParse} disabled={!pasteText.trim()||parsing} style={{background:pasteText.trim()&&!parsing?C.indigo:"#ccc",color:C.white,border:"none",borderRadius:8,padding:"12px 24px",fontSize:13,fontFamily:"'Montserrat',sans-serif",fontWeight:700,cursor:pasteText.trim()&&!parsing?"pointer":"default"}}>
              {parsing?"Parsing with Claude...":"Parse Hiring Package"}
            </button>
          </>
        )}
        {step==="review"&&parsed&&(
          <>
            <button onClick={()=>setStep("paste")} style={{background:"none",border:"none",color:C.indigo,fontSize:13,fontWeight:700,cursor:"pointer",padding:"0 0 20px",fontFamily:"'Montserrat',sans-serif"}}>Back to paste</button>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,flexWrap:"wrap",gap:12}}>
              <div>
                <h1 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:22,color:C.charcoal,margin:"0 0 4px"}}>Review Parsed Data</h1>
                <p style={{fontSize:14,color:C.taupe,margin:0}}>Claude extracted the following. Review before publishing.</p>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>onPreview(parsed)} style={{background:C.lightLavender,color:C.indigo,border:"none",borderRadius:8,padding:"10px 18px",fontSize:13,fontFamily:"'Montserrat',sans-serif",fontWeight:700,cursor:"pointer"}}>Preview</button>
                <button onClick={handlePublish} disabled={saving} style={{background:C.forest,color:C.white,border:"none",borderRadius:8,padding:"10px 18px",fontSize:13,fontFamily:"'Montserrat',sans-serif",fontWeight:700,cursor:"pointer"}}>
                  {saving?"Publishing...":"Publish Role"}
                </button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
              {[["Title",parsed.title,"title"],["Slug",parsed.slug,"slug"],["Department",parsed.department,"department"],["Reports To",parsed.reportsto,"reportsto"],["Location",parsed.location,"location"],["Compensation",parsed.comp,"comp"]].map(([label,val,key])=>(
                <div key={key} style={{background:C.white,borderRadius:8,border:`1px solid #e2ddd8`,padding:"12px 14px"}}>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",color:C.taupe,marginBottom:6}}>{label}</div>
                  {editField===key?(
                    <input autoFocus defaultValue={val} onBlur={e=>{setParsed(p=>({...p,[key]:e.target.value}));setEditField(null);}} style={{width:"100%",border:`1px solid ${C.lavender}`,borderRadius:5,padding:"5px 8px",fontSize:14,color:C.charcoal,fontFamily:"inherit",boxSizing:"border-box"}}/>
                  ):(
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                      <span style={{fontSize:14,color:C.charcoal,fontWeight:600}}>{val}</span>
                      <button onClick={()=>setEditField(key)} style={{fontSize:11,color:C.indigo,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>Edit</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{background:C.lightMint,borderRadius:8,padding:"12px 16px",fontSize:13,color:C.forest,lineHeight:1.6}}>
              <strong>Looks good?</strong> Hit Preview to see the full candidate view, or Publish Role to make it live.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.sand,fontFamily:"'Inter',sans-serif"}}>
      <div style={{textAlign:"center"}}><WheelMark size={48}/><div style={{marginTop:16,fontSize:14,color:C.taupe}}>Loading...</div></div>
    </div>
  );

  if(view==="candidate"&&activeRole) return <CandidateView role={activeRole} onBack={adminAuthed?handleBack:null}/>;
  if(view==="admin"&&!adminAuthed) return <AdminLogin onSuccess={()=>setAdminAuthed(true)}/>;
  if(view==="admin"&&adminAuthed) return <AdminDashboard allRoles={allRoles} onPublish={handlePublish} onPreview={handlePreview} onDelete={handleDelete} onLogout={handleLogout}/>;
  return null;
}
