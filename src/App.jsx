import { useState, useRef, useEffect } from "react";
import { track } from "@vercel/analytics";
import cartwheelLogo from "./logo.png";

function useIsMobile() {
  const [isMobile,setIsMobile]=useState(()=>window.innerWidth<640);
  useEffect(()=>{
    const h=()=>setIsMobile(window.innerWidth<640);
    window.addEventListener("resize",h);
    return ()=>window.removeEventListener("resize",h);
  },[]);
  return isMobile;
}
import { BUILT_IN_ROLES } from "./roles.js";
import { useCopilotTracking } from "../hooks/useCopilotTracking";
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
  const ws = size==="sm" ? 22 : 28;
  const fs = size==="sm" ? 14 : 17;
  return (
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <img src={cartwheelLogo} alt="Cartwheel" style={{width:ws,height:ws,objectFit:"contain"}}/>
      <div style={{display:"flex",flexDirection:"column",lineHeight:1.1}}>
        <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:fs,color:light?C.white:C.charcoal,letterSpacing:"-0.3px"}}>Cartwheel</span>
        <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:600,fontSize:fs-5,color:light?"rgba(255,255,255,0.45)":C.taupe,letterSpacing:"1px",textTransform:"uppercase",marginTop:2}}>Candidate Copilot</span>
      </div>
    </div>
  );
}

// ── API ───────────────────────────────────────────────────────
async function callClaude(system, messages, maxTokens=8000) {
  try {
    const res = await fetch("/api/chat", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,system,messages}),
    });
    if(!res.ok){
      const err = await res.json().catch(()=>({}));
      console.error("Chat API error:", res.status, err);
      return "Sorry, something went wrong. Please try again in a moment.";
    }
    const d = await res.json();
    return d.content?.[0]?.text || "";
  } catch(e) {
    console.error("Chat API network error:", e);
    return "Sorry, something went wrong. Please check your connection and try again.";
  }
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
  "interviewers":[{
    "label":"Stage Name",
    "name":"Single person name (empty string \"\" if multiple people)",
    "title":"Person's title",
    "href":"LinkedIn URL or null",
    "multiHrefs":[{"name":"Person Name","href":"LinkedIn URL"}]
  }],
  "applyUrl":"https://job-boards.greenhouse.io/... or null if not posted",
  "links":{"cartwheel":"https://www.cartwheel.org","wallOfLove":"https://www.cartwheel.org/wall-of-love","glassdoor":null,"linkedin":"https://www.linkedin.com/company/cartwheelcare/posts/?feedView=all"}
}

INTERVIEWER STRUCTURE RULES:
- For a single interviewer: include "name", "title", and "href". Set "multiHrefs" to null or omit it.
- For multiple interviewers in the same stage: set "name" to empty string "", set "href" to null, and use "multiHrefs" array with {name, href} objects.
- Always extract LinkedIn URLs when available.

Return ONLY valid JSON, no markdown.`;


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
  
  // Priority 1: Check if we have an array of multiple interviewers
  if(Array.isArray(interviewer.multiHrefs) && interviewer.multiHrefs.length > 0) {
    return (
      <span>{interviewer.multiHrefs.map((m,j)=>(
        <span key={j}>{j>0?", ":""}<ExtLink href={m.href}>{m.name}</ExtLink></span>
      ))}</span>
    );
  }
  
  // Priority 2: Check if we have a single person with an href
  if(interviewer.href) {
    return <ExtLink href={interviewer.href}>{interviewer.name}</ExtLink>;
  }
  
  // Priority 3: Fallback to dash
  return <span style={{color:C.taupe,fontStyle:"italic"}}>—</span>;
}

// ── Animated entry wrapper (IntersectionObserver) ─────────────
function FadeIn({children, delay=0, style={}}) {
  const ref=useRef(null);
  const [vis,setVis]=useState(false);
  useEffect(()=>{
    const el=ref.current; if(!el) return;
    const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting){setVis(true);obs.disconnect();}},{threshold:0.08});
    obs.observe(el);
    return ()=>obs.disconnect();
  },[]);
  return (
    <div ref={ref} style={{
      opacity:vis?1:0,
      transform:vis?"translateY(0)":"translateY(20px)",
      transition:`opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
      ...style
    }}>{children}</div>
  );
}

// ── Accordion ─────────────────────────────────────────────────
function Accordion({q, children, defaultOpen=false}) {
  const [open,setOpen] = useState(defaultOpen);
  const panelId = useRef(`acc-${Math.random().toString(36).slice(2,8)}`).current;
  return (
    <div style={{
      border:`1px solid ${open?"rgba(57,75,153,0.3)":"rgba(15,27,31,0.08)"}`,
      borderRadius:12,
      background:open?"rgba(57,75,153,0.02)":C.white,
      overflow:"hidden",
      transition:"all 0.25s ease",
      boxShadow:open?"0 4px 20px rgba(57,75,153,0.08)":"0 1px 3px rgba(15,27,31,0.04)",
    }}>
      <button onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls={panelId} style={{
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
      <div id={panelId} role="region" aria-hidden={!open} style={{
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
    <div style={{marginBottom:32}}>
      <h2 style={{
        fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:28,
        color:light?C.white:C.charcoal,margin:0,letterSpacing:"-0.5px",lineHeight:1.15,
      }}>{children}</h2>
    </div>
  );
}

// ── Confetti canvas ───────────────────────────────────────────
function Confetti({trigger}) {
  const canvasRef=useRef(null);
  useEffect(()=>{
    if(!trigger) return;
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d");
    const W=canvas.offsetWidth, H=canvas.offsetHeight;
    canvas.width=W; canvas.height=H;
    const COLS=["#B1A5F7","#A7CF99","#EBA89B","#F0702E","#394B99","#D8D2FB"];
    let pts=Array.from({length:72},()=>({
      x:W*0.5, y:H*0.18,
      vx:(Math.random()-0.5)*15, vy:Math.random()*-12-2,
      color:COLS[Math.floor(Math.random()*COLS.length)],
      w:Math.random()*8+3, h:Math.random()*4+2,
      rot:Math.random()*360, rs:(Math.random()-0.5)*14,
      a:1,
    }));
    let raf;
    const draw=()=>{
      ctx.clearRect(0,0,W,H);
      pts=pts.filter(p=>p.a>0.02);
      pts.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.3;
        p.rot+=p.rs; p.a-=0.013;
        ctx.save();
        ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
        ctx.globalAlpha=Math.max(0,p.a);
        ctx.fillStyle=p.color;
        ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
        ctx.restore();
      });
      if(pts.length>0) raf=requestAnimationFrame(draw);
    };
    raf=requestAnimationFrame(draw);
    return()=>cancelAnimationFrame(raf);
  },[trigger]);
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:5}}/>;
}

// ── Progress Ring ─────────────────────────────────────────────
function ProgressRing({pct}) {
  const r=28,size=72,circ=2*Math.PI*r;
  const offset=circ-(pct/100)*circ;
  const [pulse,setPulse]=useState(false);
  const prev=useRef(0);
  useEffect(()=>{
    if(pct===100&&prev.current<100){setPulse(true);setTimeout(()=>setPulse(false),800);}
    prev.current=pct;
  },[pct]);
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(177,165,247,0.25)" strokeWidth={5}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={pulse?"#A7CF99":"#394B99"} strokeWidth={5}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{transition:"stroke-dashoffset 0.6s ease, stroke 0.3s ease",
            animation:pulse?"ringPulse 0.8s ease":"none"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:13,
          color:pct===100?"#A7CF99":"#B1A5F7",transition:"color 0.3s"}}>{pct}%</span>
      </div>
    </div>
  );
}

// ── Focus tooltip wrapper ──────────────────────────────────────
function HintBanner({storageKey,message}) {
  const [visible,setVisible]=useState(()=>!localStorage.getItem(storageKey));
  if(!visible) return null;
  const dismiss=()=>{ localStorage.setItem(storageKey,"1"); setVisible(false); };
  return (
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",
      background:"rgba(57,75,153,0.07)",border:"1px solid rgba(57,75,153,0.18)",
      borderRadius:10,padding:"11px 14px",marginBottom:16,gap:10}}>
      <span style={{fontSize:13,color:"#394B99",lineHeight:1.6}}>{message}</span>
      <button onClick={dismiss} style={{background:"none",border:"none",cursor:"pointer",
        color:"#394B99",fontSize:18,lineHeight:1,padding:"0 0 0 6px",flexShrink:0,opacity:0.55}}>×</button>
    </div>
  );
}

function FocusTip({focus,children}) {
  const [show,setShow]=useState(false);
  if(!focus) return children;
  return (
    <span style={{position:"relative",display:"inline-block"}}
      onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      {children}
      {show&&(
        <span style={{
          position:"absolute",bottom:"calc(100% + 7px)",left:0,
          background:"#0F1B1F",color:"#FFFFFF",fontSize:11,lineHeight:1.55,
          padding:"7px 11px",borderRadius:8,zIndex:30,
          boxShadow:"0 4px 16px rgba(15,27,31,0.25)",
          maxWidth:240,whiteSpace:"normal",display:"block",
          animation:"tooltipIn 0.15s ease both",
        }}>
          <span style={{color:"#B1A5F7",fontWeight:600}}>Focus: </span>{focus}
          <span style={{position:"absolute",bottom:-4,left:10,width:8,height:8,
            background:"#0F1B1F",transform:"rotate(45deg)"}}/>
        </span>
      )}
    </span>
  );
}

// ── Prep Notes (localStorage) ─────────────────────────────────
function PrepNotes({slug,stageIndex}) {
  const key=`notes-${slug}-${stageIndex}`;
  const [text,setText]=useState(()=>{try{return localStorage.getItem(key)||"";}catch{return "";}});
  const [saved,setSaved]=useState(false);
  const timer=useRef(null);
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  const onChange=(e)=>{
    const v=e.target.value; setText(v);
    try{localStorage.setItem(key,v);}catch{}
    setSaved(true); clearTimeout(timer.current);
    timer.current=setTimeout(()=>setSaved(false),2000);
  };
  return (
    <div style={{marginTop:16,paddingTop:16,borderTop:"1px solid rgba(15,27,31,0.07)"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
        <BookMarked size={12} color="#9C9283"/>
        <span style={{fontSize:11,fontWeight:600,color:"#9C9283",letterSpacing:"0.5px",textTransform:"uppercase",fontFamily:"'Montserrat',sans-serif"}}>My Notes</span>
        {saved&&<span style={{fontSize:10,color:"#26544F",marginLeft:"auto",display:"flex",alignItems:"center",gap:3,animation:"fadeUp 0.2s ease both"}}><Check size={9}/>Saved</span>}
      </div>
      <textarea value={text} onChange={onChange}
        placeholder="Jot down your thoughts, examples to use, things to remember..."
        style={{width:"100%",minHeight:72,padding:"10px 12px",
          border:"1px solid rgba(15,27,31,0.12)",borderRadius:8,
          fontSize:13,color:"#0F1B1F",background:"#F0ECE9",
          fontFamily:"'Inter',sans-serif",resize:"vertical",
          outline:"none",boxSizing:"border-box",lineHeight:1.6,
          transition:"border-color 0.2s"}}
        onFocus={e=>e.target.style.borderColor="rgba(57,75,153,0.4)"}
        onBlur={e=>e.target.style.borderColor="rgba(15,27,31,0.12)"}
      />
    </div>
  );
}

// ── General Notes (localStorage) ──────────────────────────────
function GeneralNotes({noteKey}) {
  const [text,setText]=useState(()=>{try{return localStorage.getItem(noteKey)||"";}catch{return "";}});
  const [saved,setSaved]=useState(false);
  const timer=useRef(null);
  const onChange=(e)=>{
    const v=e.target.value; setText(v);
    try{localStorage.setItem(noteKey,v);}catch{}
    setSaved(true); clearTimeout(timer.current);
    timer.current=setTimeout(()=>setSaved(false),2000);
  };
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{fontSize:11,fontWeight:600,color:"#9C9283",letterSpacing:"0.5px",textTransform:"uppercase",fontFamily:"'Montserrat',sans-serif"}}>General Notes</div>
        {saved&&<span style={{fontSize:10,color:"#26544F",display:"flex",alignItems:"center",gap:3}}><Check size={9}/>Saved</span>}
      </div>
      <textarea value={text} onChange={onChange}
        placeholder="Write anything here — questions you want to ask, things to research before your next conversation, impressions so far..."
        style={{width:"100%",minHeight:180,padding:"14px 16px",
          border:"1px solid rgba(15,27,31,0.12)",borderRadius:10,
          fontSize:14,color:"#0F1B1F",background:"#F0ECE9",
          fontFamily:"'Inter',sans-serif",resize:"vertical",
          outline:"none",boxSizing:"border-box",lineHeight:1.7,
          transition:"border-color 0.2s"}}
        onFocus={e=>e.target.style.borderColor="rgba(57,75,153,0.4)"}
        onBlur={e=>e.target.style.borderColor="rgba(15,27,31,0.12)"}
      />
    </div>
  );
}

// ── Interview Timeline ────────────────────────────────────────
function InterviewTimeline({role, activeStage=null}) {
  const [exp,setExp]=useState(activeStage);
  useEffect(()=>{ setExp(activeStage); },[activeStage]);
  const stages=role.stages||[];
  const prepData=role.stagePrepData||[];
  const ivs=role.interviewers||[];
  return (
    <div style={{position:"relative",paddingLeft:40}}>
      <div style={{position:"absolute",left:18,top:16,bottom:16,width:2,
        background:`linear-gradient(to bottom, #26544F, rgba(38,84,79,0.12))`,borderRadius:2}}/>
      {stages.map((stage,i)=>{
        const isExp=exp===i;
        const iv=ivs[i];
        const pd=prepData[i]||{prep:[],questions:[]};
        const isTH=stage.stage.toLowerCase().includes("take-home")||stage.stage.toLowerCase().includes("take home");
        return (
          <div key={i} style={{position:"relative",marginBottom:i<stages.length-1?12:0}}>
            <div style={{
              position:"absolute",left:-30,top:16,
              width:18,height:18,borderRadius:"50%",
              background:isExp?"#394B99":"#26544F",
              border:`3px solid ${isExp?"rgba(57,75,153,0.3)":"rgba(38,84,79,0.2)"}`,
              boxShadow:isExp?"0 0 0 4px rgba(57,75,153,0.15)":"0 0 0 3px rgba(38,84,79,0.08)",
              transition:"all 0.25s ease",cursor:"pointer",zIndex:2,
            }} onClick={()=>setExp(isExp?null:i)}/>
            {isExp&&<div style={{position:"absolute",left:-36,top:10,
              width:30,height:30,borderRadius:"50%",
              border:`1.5px solid #394B99`,opacity:0.35,
              animation:"timelinePulse 1.8s ease infinite",zIndex:1}}/>}
            <div style={{marginLeft:6,marginBottom:i<stages.length-1?0:0}}>
              <div style={{
                background:isExp?"#FFFFFF":"#F0ECE9",borderRadius:12,
                border:`1px solid ${isExp?"rgba(57,75,153,0.2)":"rgba(15,27,31,0.08)"}`,
                transition:"all 0.2s ease",
                boxShadow:isExp?"0 4px 20px rgba(57,75,153,0.08)":"0 1px 3px rgba(15,27,31,0.04)",
              }}>
                <button onClick={()=>setExp(isExp?null:i)} style={{
                  width:"100%",background:"none",border:"none",cursor:"pointer",textAlign:"left",padding:"14px 16px",
                }}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <span style={{
                          background:isExp?"#394B99":"rgba(57,75,153,0.08)",
                          color:isExp?"#FFFFFF":"#394B99",
                          borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,
                          fontFamily:"'Montserrat',sans-serif",transition:"all 0.2s",
                        }}>{stage.time}</span>
                        <span style={{fontSize:10,color:"#9C9283",fontFamily:"'Montserrat',sans-serif"}}>Stage {i+1}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:14,color:"#0F1B1F",marginBottom:3}}>{stage.stage}</div>
                        {(()=>{try{return localStorage.getItem(`notes-${role.slug}-${i}`);}catch{return null;}})()&&(
                          <div style={{width:6,height:6,borderRadius:"50%",background:C.indigo,flexShrink:0,marginBottom:3}}/>
                        )}
                      </div>
                      <div style={{fontSize:12,color:"#9C9283"}}>
                        {iv?<FocusTip focus={stage.focus}><InterviewerDisplay interviewer={iv}/></FocusTip>:<span style={{fontStyle:"italic"}}>Self-directed</span>}
                      </div>
                    </div>
                    <ChevronDown size={14} color="#394B99" style={{flexShrink:0,marginTop:3,transform:isExp?"rotate(180deg)":"none",transition:"0.2s"}}/>
                  </div>
                </button>
                {isExp&&(
                  <div style={{padding:"0 16px 14px",borderTop:"1px solid rgba(57,75,153,0.08)"}}>
                    <div style={{
                      background:"linear-gradient(135deg, rgba(57,75,153,0.05), rgba(177,165,247,0.08))",
                      borderRadius:8,padding:"9px 12px",marginBottom:14,marginTop:14,
                      border:"1px solid rgba(57,75,153,0.1)",
                    }}>
                      <span style={{fontSize:11,fontWeight:600,color:"#394B99",fontFamily:"'Montserrat',sans-serif"}}>Focus: </span>
                      <span style={{fontSize:13,color:"#0F1B1F"}}>{stage.focus}</span>
                    </div>
                    {pd.prep.length>0&&(
                      <div style={{marginBottom:isTH||pd.questions.length===0?0:14}}>
                        <div style={{fontSize:10,fontWeight:700,color:"#9C9283",letterSpacing:"1px",textTransform:"uppercase",marginBottom:8,fontFamily:"'Montserrat',sans-serif"}}>How to prepare</div>
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          {pd.prep.map((tip,j)=>(
                            <div key={j} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                              <div style={{width:4,height:4,borderRadius:"50%",background:"#B1A5F7",flexShrink:0,marginTop:7}}/>
                              <span style={{fontSize:13,color:"#4a5568",lineHeight:1.6}}>{tip}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {!isTH&&pd.questions.length>0&&(
                      <div style={{background:"#D3E7CC",borderRadius:10,padding:"16px",marginTop:pd.prep.length>0?0:0}}>
                        <div style={{fontSize:10,fontWeight:700,color:"#26544F",letterSpacing:"1px",textTransform:"uppercase",marginBottom:10,fontFamily:"'Montserrat',sans-serif"}}>Questions to ask</div>
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          {pd.questions.map((q,j)=>(
                            <div key={j} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                              <MessageCircle size={12} color="#26544F" style={{flexShrink:0,marginTop:2}}/>
                              <span style={{fontSize:13,color:"#0F1B1F",fontStyle:"italic",lineHeight:1.6}}>"{q}"</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <PrepNotes slug={role.slug} stageIndex={i}/>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Checklist ─────────────────────────────────────────────────
function PrepChecklist({role, activeStage=null}) {
  const [checked,setChecked]=useState({});
  const [openStage,setOpenStage]=useState(activeStage??0);
  useEffect(()=>{ if(activeStage!==null) setOpenStage(activeStage); },[activeStage]);
  const [confetti,setConfetti]=useState(0);
  const prev=useRef(0);
  const toggle=(si,ii)=>{const k=`${si}-${ii}`;setChecked(p=>({...p,[k]:!p[k]}));};
  const progress=(si)=>{const items=(role.checklist||[])[si]?.items||[];return{done:items.filter((_,i)=>checked[`${si}-${i}`]).length,total:items.length};};
  const totalDone=Object.values(checked).filter(Boolean).length;
  const totalItems=(role.checklist||[]).reduce((a,s)=>a+(s.items?.length||0),0);
  const pct=totalItems?Math.round((totalDone/totalItems)*100):0;
  useEffect(()=>{
    if(pct===100&&prev.current<100) setTimeout(()=>setConfetti(c=>c+1),650);
    prev.current=pct;
  },[pct]);

  return (
    <div>
      {/* Progress header */}
      <div style={{
        background:C.charcoal,borderRadius:16,padding:"20px 24px",
        marginBottom:20,display:"flex",alignItems:"center",gap:20,
        position:"relative",overflow:"hidden",
      }}>
        <Confetti trigger={confetti}/>
        <ProgressRing pct={pct}/>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:13,color:C.white,marginBottom:8}}>
            Your preparation progress
          </div>
          <div style={{background:"rgba(255,255,255,0.1)",borderRadius:99,height:6,overflow:"hidden"}}>
            <div style={{
              height:"100%",
              background:pct===100?`linear-gradient(90deg,${C.mint},${C.forest})`:`linear-gradient(90deg,${C.lavender},${C.indigo})`,
              borderRadius:99,width:`${pct}%`,transition:"width 0.5s ease, background 0.5s ease",
            }}/>
          </div>
          {pct===100&&<div style={{fontSize:12,color:C.mint,marginTop:6,fontWeight:600,animation:"fadeUp 0.4s ease both"}}>You're fully prepared. Go get it.</div>}
        </div>
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
                    background:complete?C.indigo:isOpen?C.indigo:"rgba(57,75,153,0.1)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    transition:"all 0.2s ease",
                  }}>
                    {complete
                      ? <Check size={14} color={C.white}/>
                      : <span style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,fontWeight:700,color:isOpen?C.white:C.indigo}}>{si+1}</span>
                    }
                  </div>
                  <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:600,fontSize:14,color:complete?C.indigo:C.charcoal}}>{section.stage}</span>
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
                          border:`2px solid ${isChecked?C.indigo:"rgba(15,27,31,0.2)"}`,
                          background:isChecked?C.indigo:"transparent",
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
        const isTakeHome=stage.stage.toLowerCase().includes("take-home")||stage.stage.toLowerCase().includes("take home");
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
                    {interviewer
                      ? <FocusTip focus={stage.focus}><InterviewerDisplay interviewer={interviewer}/></FocusTip>
                      : <span style={{color:C.taupe,fontStyle:"italic"}}>—</span>}
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
                    <div style={{background:C.lightLavender,borderRadius:10,padding:"16px"}}>
                      <SectionLabel>Questions to ask</SectionLabel>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {pd.questions.map((q,j)=>(
                          <div key={j} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                            <div style={{width:4,height:4,borderRadius:"50%",background:C.indigo,flexShrink:0,marginTop:7}}/>
                            <span style={{fontSize:13,color:C.indigo,lineHeight:1.6,fontStyle:"italic"}}>"{q}"</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <PrepNotes slug={role.slug} stageIndex={i}/>
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
  const isMobile=useIsMobile();
  return (
    <Accordion q="What is Cartwheel's mission?">
      <p style={{fontSize:14,color:"#4a5568",lineHeight:1.75,margin:"12px 0 16px"}}>
        Cartwheel partners with K-12 schools to provide accessible mental health care to students — enabling earlier intervention, higher engagement, and better-coordinated care. Instead of going around school staff, we work alongside them.
      </p>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10}}>
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

// ── Markdown renderer for chat responses ──────────────────────
function renderInline(str) {
  const parts = str.split(/(\*\*[^*]+?\*\*)/g);
  return parts.map((part,j)=>{
    if(part.startsWith("**")&&part.endsWith("**"))
      return <strong key={j} style={{fontWeight:600}}>{part.slice(2,-2)}</strong>;
    return part;
  });
}
function renderMarkdown(text) {
  const lines=text.split("\n");
  const result=[];
  let i=0,k=0;
  while(i<lines.length){
    const line=lines[i].trim();
    if(line===""){i++;continue;}
    if(line.startsWith("- ")||line.startsWith("• ")){
      const items=[];
      while(i<lines.length&&(lines[i].trim().startsWith("- ")||lines[i].trim().startsWith("• "))){
        items.push(lines[i].trim().replace(/^[-•]\s+/,""));i++;
      }
      result.push(<ul key={k++} style={{margin:"4px 0 10px",paddingLeft:18}}>{items.map((it,j)=><li key={j} style={{marginBottom:4,lineHeight:1.65}}>{renderInline(it)}</li>)}</ul>);
      continue;
    }
    if(/^\d+\.\s/.test(line)){
      const items=[];
      while(i<lines.length&&/^\d+\.\s/.test(lines[i].trim())){
        items.push(lines[i].trim().replace(/^\d+\.\s+/,""));i++;
      }
      result.push(<ol key={k++} style={{margin:"4px 0 10px",paddingLeft:18}}>{items.map((it,j)=><li key={j} style={{marginBottom:4,lineHeight:1.65}}>{renderInline(it)}</li>)}</ol>);
      continue;
    }
    result.push(<p key={k++} style={{margin:"0 0 8px",lineHeight:1.7}}>{renderInline(line)}</p>);
    i++;
  }
  return result;
}

// ── Why Cartwheel reveal card ─────────────────────────────────
function WhyCartwheel() {
  const [open,setOpen]=useState(false);
  return (
    <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",background:"none",border:"none",padding:0,cursor:"pointer",textAlign:"left"}}>
      <div style={{
        background:open?"rgba(216,210,251,0.15)":C.white,
        border:"1px solid rgba(57,75,153,0.1)",
        borderRadius:16,padding:"24px",
        transition:"background 0.4s ease, box-shadow 0.3s ease",
        boxShadow:open?"0 4px 20px rgba(57,75,153,0.08)":"0 1px 4px rgba(15,27,31,0.05)",
        textAlign:"center",
      }}>
        <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:18,color:C.indigo,marginBottom:10}}>
          Why Cartwheel?
        </div>
        <div style={{display:"flex",justifyContent:"center",animation:open?"none":"chevronPulse 2s ease infinite"}}>
          <ChevronDown size={18} color={C.lavender} style={{transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.4s ease"}}/>
        </div>
        <div style={{maxHeight:open?"220px":"0",overflow:"hidden",transition:"max-height 0.4s ease"}}>
          <div style={{paddingTop:20}}>
            <p style={{fontFamily:"'Montserrat',sans-serif",fontSize:15,fontWeight:500,color:C.charcoal,lineHeight:1.8,margin:"0 auto 10px",maxWidth:520}}>
              If you're looking for work that matters, a team that uplifts you, and a company positioned to scale impact at unprecedented speed —
            </p>
            <p style={{fontFamily:"'Montserrat',sans-serif",fontSize:20,fontWeight:700,color:C.lavender,lineHeight:1.4,margin:"0 auto",maxWidth:520}}>
              you're in the right place.
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── CandidateFooter ───────────────────────────────────────────
function CandidateFooter() {
  return (
    <div style={{marginTop:32,paddingTop:24,borderTop:"1px solid rgba(15,27,31,0.07)"}}>
      <div style={{fontSize:12,color:C.taupe,lineHeight:1.6,marginBottom:8}}>Questions? Reach out to your coordinator at any time.</div>
      <div style={{fontSize:10,color:C.taupe,lineHeight:1.7,fontStyle:"italic",opacity:0.7}}>
        <p style={{margin:"0 0 6px"}}>Cartwheel is proud to be an equal opportunity employer. We embrace diverse backgrounds and perspectives and are committed to equal employment opportunities regardless of race, color, religion, ancestry, national origin, gender, sexual orientation, disability status, or veteran status.</p>
        <p style={{margin:"0 0 6px"}}>Compensation is determined by a number of factors including experience, qualifications, skills, and geographic location.</p>
        <p style={{margin:"0 0 6px"}}>The interview process outlined here represents our general approach. Not all candidates will complete every stage, and the process may be adjusted based on role requirements or scheduling needs.</p>
        <p style={{margin:"0 0 6px"}}>We participate in E-Verify and are committed to complying with all federal employment verification requirements.</p>
        <p style={{margin:"0 0 6px"}}>Cartwheel is committed to providing reasonable accommodations for candidates with disabilities during the interview process. If you need accommodations, please reach out to your recruiter.</p>
        <p style={{margin:"0 0 6px"}}>Information on this page, including compensation ranges, interview stages, and team structure, is subject to change.</p>
        <p style={{margin:0}}>Information you share during the interview process, including through this platform's AI assistant, is used solely for recruitment purposes and handled in accordance with applicable privacy laws.</p>
      </div>
    </div>
  );
}

// ── HoverDiv utility ─────────────────────────────────────────
function HoverDiv({baseStyle,hoverStyle,children,...rest}) {
  const [hov,setHov]=useState(false);
  return (
    <div style={{...baseStyle,...(hov?hoverStyle:{})}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      {...rest}>{children}</div>
  );
}

// ── Stage-aware greeting ──────────────────────────────────────
function makeGreeting(role,stageIdx) {
  if(stageIdx!==null&&stageIdx!==undefined){
    const s=(role.stages||[])[stageIdx];
    if(s) return `Hi. I see you're preparing for your **${s.stage}** with ${s.who}.\n\nTheir focus is: ${s.focus}.\n\nAsk me anything specific to this stage — I can help you prep your stories, anticipate what they'll probe, and figure out what questions to ask them.`;
  }
  return `Hi. I'm here to help you prepare for your ${role.title} interview at Cartwheel.\n\nAsk me anything about the process, the team, or what to expect. I'll give you honest, specific answers — not hype.`;
}

// ── Stage Picker Modal ────────────────────────────────────────
function StagePickerModal({role,activeStage,onSelect,onClose}) {
  const stages=role.stages||[];
  return (
    <div role="dialog" aria-modal="true" aria-label="Stage picker" style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(15,27,31,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:16,padding:"28px 24px",maxWidth:480,width:"100%",position:"relative",maxHeight:"90vh",overflowY:"auto"}}>
        <button onClick={onClose} aria-label="Close" style={{position:"absolute",top:14,right:14,background:"rgba(15,27,31,0.06)",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <X size={13} color={C.charcoal}/>
        </button>
        <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:19,color:C.charcoal,marginBottom:6,paddingRight:32}}>Which stage are you preparing for?</div>
        <div style={{fontSize:13,color:C.taupe,marginBottom:20,lineHeight:1.55}}>Select a stage to get focused prep tips, auto-expand that section, and tune the AI to your current round.</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {stages.map((s,i)=>(
            <button key={i} onClick={()=>{onSelect(i===activeStage?null:i);onClose();}} style={{
              padding:"12px 16px",borderRadius:10,textAlign:"left",border:`1.5px solid ${activeStage===i?C.indigo:"rgba(15,27,31,0.12)"}`,
              background:activeStage===i?`linear-gradient(135deg,${C.indigo},#2d3d85)`:C.white,
              color:activeStage===i?C.white:C.charcoal,cursor:"pointer",transition:"all 0.15s",width:"100%",
            }}>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:13}}>{s.stage}</div>
              <div style={{fontSize:11,marginTop:2,opacity:activeStage===i?0.7:0.5}}>{s.time}{s.who&&s.who!=="Self"?` · ${s.who}`:""}</div>
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{marginTop:14,width:"100%",background:"none",border:"1px solid rgba(15,27,31,0.1)",borderRadius:10,padding:"10px",color:C.taupe,fontSize:13,cursor:"pointer",fontFamily:"'Montserrat',sans-serif",fontWeight:500}}>
          See all stages
        </button>
      </div>
    </div>
  );
}

// ── Stage Picker (inline strip) ───────────────────────────────
function StagePicker({stages,activeStage,onSelect,onBrief,isMobile}) {
  return (
    <div style={{background:C.white,borderBottom:"1px solid rgba(15,27,31,0.06)",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
      <style>{`.sp-row::-webkit-scrollbar{display:none}`}</style>
      <div className="sp-row" style={{maxWidth:860,margin:"0 auto",display:"flex",alignItems:"center",gap:6,padding:isMobile?"10px 16px":"10px 32px",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        <span style={{fontSize:10,fontWeight:700,color:C.taupe,letterSpacing:"0.8px",textTransform:"uppercase",whiteSpace:"nowrap",marginRight:4,flexShrink:0}}>Preparing for:</span>
        {stages.map((s,i)=>(
          <button key={i} onClick={()=>onSelect(i===activeStage?null:i)} style={{
            padding:isMobile?"5px 10px":"5px 12px",borderRadius:99,flexShrink:0,
            border:`1.5px solid ${activeStage===i?C.indigo:"rgba(15,27,31,0.14)"}`,
            background:activeStage===i?C.indigo:"transparent",
            color:activeStage===i?C.white:C.charcoal,
            fontSize:isMobile?11:12,fontWeight:600,fontFamily:"'Montserrat',sans-serif",
            cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.15s",
          }}>{s.stage}</button>
        ))}
        {activeStage!==null&&(
          <button onClick={onBrief} style={{
            marginLeft:"auto",flexShrink:0,
            display:"flex",alignItems:"center",gap:6,
            padding:isMobile?"5px 12px":"5px 14px",borderRadius:99,
            background:`linear-gradient(135deg,${C.indigo},#2d3d85)`,
            border:"none",color:C.white,
            fontSize:isMobile?11:12,fontWeight:700,fontFamily:"'Montserrat',sans-serif",
            cursor:"pointer",boxShadow:"0 2px 8px rgba(57,75,153,0.3)",
            whiteSpace:"nowrap",
          }}>
            <BookMarked size={12}/> Get my brief
          </button>
        )}
      </div>
    </div>
  );
}

// ── Pre-Interview Brief Modal ─────────────────────────────────
function BriefModal({role,stageIndex,onClose,isMobile}) {
  const stage=(role.stages||[])[stageIndex];
  const pd=(role.stagePrepData||[])[stageIndex]||{prep:[],questions:[]};
  const iv=(role.interviewers||[])[stageIndex];
  const notes=(()=>{try{return localStorage.getItem(`notes-${role.slug}-${stageIndex}`)||"";}catch{return "";}})();
  if(!stage) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Pre-interview brief" style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(15,27,31,0.55)",backdropFilter:"blur(4px)",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:24}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:isMobile?"20px 20px 0 0":16,width:"100%",maxWidth:isMobile?"100%":560,maxHeight:isMobile?"92vh":"85vh",overflowY:"auto",padding:"28px 28px 36px",position:"relative"}}>
        <button onClick={onClose} aria-label="Close" style={{position:"absolute",top:16,right:16,background:"rgba(15,27,31,0.06)",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <X size={14} color={C.charcoal}/>
        </button>
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{background:C.indigo,color:C.white,borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,fontFamily:"'Montserrat',sans-serif"}}>{stage.time}</span>
            <span style={{fontSize:11,color:C.taupe,fontFamily:"'Montserrat',sans-serif"}}>Stage {stageIndex+1}</span>
          </div>
          <h2 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:22,color:C.charcoal,margin:"0 0 8px",letterSpacing:"-0.3px"}}>{stage.stage}</h2>
          <div style={{fontSize:13,color:"#4a5568",marginBottom:iv?6:0}}><span style={{fontWeight:600,color:C.indigo}}>Focus: </span>{stage.focus}</div>
          {iv&&<div style={{fontSize:13,color:C.taupe}}>With: <InterviewerDisplay interviewer={iv}/></div>}
        </div>
        {pd.prep.length>0&&(
          <div style={{marginBottom:20}}>
            <div style={{fontSize:10,fontWeight:700,color:C.taupe,letterSpacing:"1px",textTransform:"uppercase",marginBottom:10,fontFamily:"'Montserrat',sans-serif"}}>How to prepare</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {pd.prep.map((tip,i)=>(
                <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{width:5,height:5,borderRadius:"50%",background:C.lavender,flexShrink:0,marginTop:7}}/>
                  <span style={{fontSize:13,color:"#4a5568",lineHeight:1.65}}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {pd.questions.length>0&&(
          <div style={{marginBottom:20}}>
            <div style={{background:C.lightMint,borderRadius:10,padding:16}}>
              <div style={{fontSize:10,fontWeight:700,color:C.forest,letterSpacing:"1px",textTransform:"uppercase",marginBottom:10,fontFamily:"'Montserrat',sans-serif"}}>Questions to ask</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {pd.questions.map((q,i)=>(
                  <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                    <MessageCircle size={12} color={C.forest} style={{flexShrink:0,marginTop:2}}/>
                    <span style={{fontSize:13,color:C.charcoal,fontStyle:"italic",lineHeight:1.6}}>"{q}"</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div>
          <div style={{fontSize:10,fontWeight:700,color:C.taupe,letterSpacing:"1px",textTransform:"uppercase",marginBottom:8,fontFamily:"'Montserrat',sans-serif"}}>My Notes</div>
          {notes
            ? <div style={{background:"#F0ECE9",borderRadius:8,padding:"12px 14px",fontSize:13,color:C.charcoal,lineHeight:1.65,whiteSpace:"pre-wrap"}}>{notes}</div>
            : <div style={{fontSize:12,color:C.taupe,fontStyle:"italic"}}>No notes yet — expand this stage in the Roadmap tab to add some.</div>
          }
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CANDIDATE VIEW
// ══════════════════════════════════════════════════════════════
function CandidateView({role,onBack}) {
  const isMobile=useIsMobile();
  const [tab,setTab]=useState("guide");
  const [activeStage,setActiveStage]=useState(()=>{
    try{const v=localStorage.getItem(`activeStage-${role.slug}`);return v!==null?parseInt(v,10):null;}catch{return null;}
  });
  const [showBrief,setShowBrief]=useState(false);
  const [showStagePicker,setShowStagePicker]=useState(false);
  const [msgs,setMsgs]=useState(()=>{
    try{const v=localStorage.getItem(`activeStage-${role.slug}`);const idx=v!==null?parseInt(v,10):null;return [{role:"assistant",content:makeGreeting(role,idx)}];}
    catch{return [{role:"assistant",content:makeGreeting(role,null)}];}
  });
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const endRef=useRef(null);
  const chatTrackedRef=useRef(false);
  const { trackChatOpened, trackMessageSent, trackChatEnded, trackApplyClicked } = useCopilotTracking({ roleId: role.slug, roleTitle: role.title, roleFamily: role.department });

  const handleStageSelect=(idx)=>{
    setActiveStage(idx);
    try{
      if(idx===null) localStorage.removeItem(`activeStage-${role.slug}`);
      else localStorage.setItem(`activeStage-${role.slug}`,String(idx));
    }catch{}
  };

  // Reset chat when stage changes
  useEffect(()=>{
    setMsgs([{role:"assistant",content:makeGreeting(role,activeStage)}]);
    chatTrackedRef.current=false;
  },[activeStage]);

  // Show stage picker when entering roadmap tab
  useEffect(()=>{ if(tab==="roadmap") setShowStagePicker(true); },[tab]);

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading]);
  useEffect(()=>{
    if(tab==="chat"&&!chatTrackedRef.current){
      chatTrackedRef.current=true;
      track("chat_opened",{role_page:role.slug,role_family:role.department});
      trackChatOpened();
    }
    return ()=>{ if(tab==="chat") trackChatEnded(); };
  },[tab]);

  const _activeStageData=activeStage!==null?(role.stages||[])[activeStage]:null;
  const _activePrepData=activeStage!==null?(role.stagePrepData||[])[activeStage]:null;
  const stageContext=_activeStageData
    ?`ACTIVE STAGE: The candidate is preparing for Stage ${activeStage+1}: "${_activeStageData.stage}" (${_activeStageData.time}, focus: ${_activeStageData.focus}). Prioritize guidance for this stage.

STAGE PREP:
${(_activePrepData?.prep||[]).map(t=>`- ${t}`).join('\n')}

QUESTIONS TO ASK IN THIS STAGE:
${(_activePrepData?.questions||[]).map(q=>`- "${q}"`).join('\n')}

`
    :"";

  const CHAT_SYSTEM=`${stageContext}You are a calm, honest, and helpful interview preparation assistant for Cartwheel — a K-12 mental health telehealth company. You are helping a candidate prepare for their ${role.title} interview.

Tone: calm, human, reassuring but honest. Never hypey. Don't say things like "you'll crush it" or "amazing opportunity." Be specific and practical.

ROLE: ${role.title} | Reports to ${role.reportsto} | ${role.location} | ${role.comp}

ABOUT: ${role.aboutRole}

MISSION: ${role.mission}

STAGES: ${(role.stages||[]).map(s=>`${s.stage} (${s.time}): ${s.who} — ${s.focus}`).join("; ")}

SUCCESS MILESTONES: ${(role.success||[]).map(s=>`${s.period}: ${s.desc}`).join(" | ")}

MUST HAVE: ${(role.mustHave||[]).join("; ")}

YOU'LL THRIVE IF YOU: ${(role.thrive||[]).join("; ")}

THIS MAY NOT BE RIGHT IF YOU: ${(role.notfor||[]).join("; ")}

PREP TIPS: ${(role.prep||[]).join("; ")}

CONTACTS: ${(role.contacts||[]).join("; ")}

COMP & BENEFITS: ${role.compBenefits}

COMPANY: Series B, backed by Menlo Ventures, Reach Capital, General Catalyst. Largest K-12 mental health telehealth provider in US. 350+ school districts, 1.5M students enrolled. 58% full remission of anxiety; 3x reduction in depression; 92% of families recommend.

BENEFITS: PPO medical/vision/dental/orthodontia, paid parental leave (12 weeks), 401K with 2% employer match, generous PTO including Dec 25-Jan 1 closure, $500 learning stipend, MacBook, equity, remote + annual retreat.

CULTURE:
Mission connection: Cartwheel serves 350+ K-12 school districts across 16 states, 1.5M students. Even non-clinical roles feel the mission — clinicians share real patient stories in full-team meetings ("Clinical Spotlight"). A 14-year-old who went from severe self-harm and academic failure to honor roll. That context shapes how people work across every function. If asked whether non-clinicians feel connected to the mission: yes, and it's by design.

Feedback culture: One of Cartwheel's most distinctive qualities. Wins are celebrated loudly. Misses are handled by acknowledging what happened, getting curious, agreeing on what to do differently, and moving on — no lingering blame or political fallout. People feel safe being honest and raising issues early. Leadership models this: Dan and Joe (co-CEOs) openly communicate about uncertainty and things they're still figuring out, not just wins. Don't describe this with buzzwords like "radical candor" — it's a practiced norm reinforced by example.

Remote but connected: Fully remote. Invests meaningfully in connection: annual in-person retreats each summer (Summer 2026 scheduled week of July 20th); monthly full-team all-hands with promotions, clinical spotlights, exec updates; #sunbeams Slack channel for shoutouts and celebration (one of the most active channels); community Slack channels for hobbies and interests; Winter Connection Program for regional in-person meetups; Cartwheeler Map in Guru to find colleagues nearby; Wellness challenges, Mindfulness Mondays, ERG events. If a candidate is worried about remote isolation: acknowledge it's a valid concern and be specific about what Cartwheel actually does.

ERGs and inclusion: Three active ERGs — Mosaic Network (BIPOC), Diverse Abilities ERG (disability inclusion, has a Guru hub), 2SLGBTQ+ ERG. These are not performative. When political pressure pushed companies to pull back on DEI, Cartwheel leadership explicitly named maintaining and strengthening ERGs as a priority. Joe English addressed the team directly when immigration enforcement news was affecting communities Cartwheel serves — named the affected communities, acknowledged the emotional weight, offered specific resources. Don't just list the ERGs — explain that leadership speaks about inclusion directly, not through HR proxies, and that serving diverse communities (immigrant families, under-resourced districts) makes inclusion a professional necessity.

Pace and autonomy: Series B, 40% forecasted visit growth. Fast-moving. Values building over talking. People make decisions independently rather than seeking constant approval. Has moved away from over-planning toward "build it and see" iteration. Aggressively AI-forward across all teams — Claude is used company-wide including under a BAA for healthcare compliance. If asked about pace: be honest that it's a high-growth startup with real growing pains. Things are not figured out and stable. You help figure things out. That's either exciting or exhausting depending on the person — be upfront about that.

Leadership: Co-CEOs Dan Tartakovsky and Joe English are visible, accessible, and emotionally present. Real examples: Joe sent a full-team message during immigration enforcement news — named the emotional toll, reminded people of EAP and mental health days, said "Leading with compassion and care for one another is part of what it means to be human first." Mental health days are explicitly included in sick time with zero stigma — "Mental health is health. You do not need to be in crisis to reach out." When a team member became a surprise foster parent with two hours' notice, her team covered without being asked. If asked what makes leadership different: give specifics, not "our leaders are approachable."

"Never Worry Alone": A cultural mantra at Cartwheel. Means: lean on teammates, ask for help early, don't white-knuckle through hard things. Applies to clinical care and to how the internal team operates. When people describe what they love about working here, the emotional safety net — people genuinely having each other's backs — comes up consistently. Employees who leave write warm farewell notes in #sunbeams, thank colleagues by name, and speak highly of the mission even on their way out.

INTERVIEW TIPS (share these when candidates ask how to prepare practically):
1. Test your setup: Most interviews are on Zoom. Test the meeting link, audio, video, and internet connection beforehand. If using a phone, ensure a strong cell connection.
2. Choose your space: Join from a quiet, distraction-free environment. Computer or tablet is ideal, but a well-prepared phone works too. Feel free to blur your background or use a Zoom background.
3. Do a little homework: Review the job description and think of stories or examples from past work that highlight your skills. Look up your interviewer's background on LinkedIn. Bring questions — this is your chance to interview Cartwheel too.
4. Dress your way: Cartwheel values authenticity. Wear whatever makes you feel your best and ready to engage.

RULES:
- Only answer from the information above. Do not make up details.
- If you do not have the information to answer a question, say so honestly and direct them to their coordinator.
- Never share email addresses. If someone asks for contact info, give names only and say to reach out to their coordinator.
- Be concise. Keep answers to 2-4 paragraphs max.

HANDLING DIFFICULT SITUATIONS:
- If a candidate expresses frustration about not moving forward, acknowledge their feelings with empathy. Say something like: "I understand that's disappointing, and I appreciate you sharing that." Never be defensive or dismissive.
- Do not explain why they were not selected. You do not have that information and should not speculate.
- Do not make promises about reconsideration or future opportunities.
- If they ask for specific feedback on why they were rejected, say: "I don't have access to interviewer feedback. I'd recommend reaching out to your recruiter directly — they can share any feedback that's available."
- If a candidate becomes hostile or uses inappropriate language, stay calm and professional. Say: "I understand you're frustrated. I want to be helpful, but I'm only able to assist with interview preparation questions. For anything else, please reach out to your recruiter directly."
- If they ask to speak to someone in charge or escalate a complaint, direct them to their recruiter by name. Do not provide email addresses.
- If they ask about the status of their application, say: "I don't have access to application status. Your recruiter can give you the most up-to-date information."
- If they threaten legal action or make serious complaints, say: "I understand this is important to you. Please reach out to your recruiter directly so the right person can address your concerns."
- Never argue with a candidate. Never blame them. Never suggest what they did wrong.
- Always end difficult interactions by reinforcing that Cartwheel values their time and interest: "We genuinely appreciate you taking the time to interview with us."`;

  const send=async(text)=>{
    const q=(text||input).trim();if(!q)return;
    setInput("");
    if(msgs.length===1){
      track("chat_message_sent",{role_page:role.slug,role_family:role.department,message_preview:q.slice(0,100)});
    }
    trackMessageSent();
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
    {id:"guide",label:"Overview",shortLabel:"Overview",icon:<BookOpen size={14}/>},
    {id:"jd",label:"Job Description",shortLabel:"JD",icon:<FileText size={14}/>},
    {id:"chat",label:"Ask",shortLabel:"Ask",icon:<MessageCircle size={14}/>},
    {id:"roadmap",label:"Roadmap",shortLabel:"Roadmap",icon:<Map size={14}/>},
    {id:"culture",label:"Life at Cartwheel",shortLabel:"Culture",icon:<Heart size={14}/>},
    {id:"checklist",label:"Checklist",shortLabel:"Checklist",icon:<CheckSquare size={14}/>},
    {id:"notes",label:"My Notes",shortLabel:"Notes",icon:<BookMarked size={14}/>},
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

      {/* Hero */}
      <div style={{background:C.white,paddingTop:72,position:"relative",overflow:"hidden"}}>
        {/* Decorative shapes — fully contained */}
        <div style={{position:"absolute",top:20,right:"4%",width:120,height:120,borderRadius:"50%",background:"rgba(177,165,247,0.09)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:40,right:"26%",width:36,height:36,borderRadius:"50%",background:"rgba(57,75,153,0.06)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:180,right:"7%",width:52,height:52,borderRadius:"50%",background:"rgba(177,165,247,0.07)",pointerEvents:"none"}}/>

        {/* Heading block */}
        <div style={{maxWidth:860,margin:"0 auto",padding:isMobile?"0 20px 40px":"0 32px 52px"}}>
          <FadeIn delay={0}>
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:7,background:"rgba(38,84,79,0.07)",border:"1px solid rgba(38,84,79,0.15)",borderRadius:99,padding:"5px 13px",fontSize:12,fontWeight:600,color:C.forest,fontFamily:"'Inter',sans-serif"}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:C.mint,boxShadow:`0 0 0 3px rgba(167,207,153,0.35)`,display:"inline-block",animation:"dotGlow 2s ease-in-out infinite"}}/>
                {role.department}
              </span>
            </div>
          </FadeIn>

          <FadeIn delay={60}>
            <h1 style={{
              fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:isMobile?34:56,
              color:C.charcoal,margin:"0 0 14px",letterSpacing:isMobile?"-0.5px":"-1.5px",lineHeight:1.05,
            }}>{role.title}</h1>
          </FadeIn>

          <FadeIn delay={100}>
            <p style={{
              fontSize:15,color:"#4B5563",lineHeight:1.65,
              maxWidth:580,margin:"0 0 28px",fontWeight:400,
            }}>
              {role.mission}
            </p>
          </FadeIn>

          <FadeIn delay={160}>
            <div style={{
              display:"flex",
              flexDirection:isMobile?"column":"row",
              gap:isMobile?0:0,
              marginBottom:44,
              borderTop:"1px solid rgba(15,27,31,0.07)",paddingTop:20,
            }}>
              <div style={{
                paddingRight:isMobile?0:36,marginRight:isMobile?0:36,
                borderRight:isMobile?"none":"1px solid rgba(15,27,31,0.08)",
                paddingBottom:isMobile?16:0,marginBottom:isMobile?16:0,
                borderBottom:isMobile?"1px solid rgba(15,27,31,0.07)":"none",
              }}>
                <div style={{fontSize:11,color:C.taupe,fontWeight:600,letterSpacing:"0.4px",marginBottom:5}}>Reports to</div>
                <div style={{fontSize:15,color:C.charcoal,fontWeight:600}}>
                  {role.reportstoHref
                    ? <ExtLink href={role.reportstoHref}>{role.reportsto}</ExtLink>
                    : role.reportsto}
                </div>
              </div>
              <div style={{
                paddingRight:isMobile?0:36,marginRight:isMobile?0:36,
                borderRight:isMobile?"none":"1px solid rgba(15,27,31,0.08)",
                paddingBottom:isMobile?16:0,marginBottom:isMobile?16:0,
                borderBottom:isMobile?"1px solid rgba(15,27,31,0.07)":"none",
              }}>
                <div style={{fontSize:11,color:C.taupe,fontWeight:600,letterSpacing:"0.4px",marginBottom:5}}>Location</div>
                <div style={{fontSize:15,color:C.charcoal,fontWeight:600}}>{role.location}</div>
              </div>
              <div>
                <div style={{fontSize:11,color:C.taupe,fontWeight:600,letterSpacing:"0.4px",marginBottom:5}}>Compensation</div>
                <div style={{
                  display:"inline-block",
                  background:C.lightMint,borderRadius:8,
                  padding:"5px 12px",
                  fontSize:15,color:C.forest,fontWeight:700,
                }}>{role.comp}</div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Stats — full-width indigo band */}
        <FadeIn delay={240}>
          <div style={{background:C.forest}}>
            <div style={{maxWidth:860,margin:"0 auto",display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)"}}>
              {[
                {n:"350+",label:"School Districts",sub:"Serving 2.5% of U.S. districts"},
                {n:"$20M",label:"in ARR",sub:"Achieved in just 3 years"},
                {n:"300%",label:"YoY Growth",sub:"Capital-efficient scale"},
                {n:"1.5M",label:"Students",sub:"Enrolled across districts"},
              ].map(({n,label,sub},i)=>(
                <div key={n} style={{
                  padding:isMobile?"28px 20px":"44px 32px",
                  borderRight:isMobile?(i%2===0?"1px solid rgba(167,207,153,0.2)":"none"):(i<3?"1px solid rgba(167,207,153,0.2)":"none"),
                  borderBottom:isMobile&&i<2?"1px solid rgba(167,207,153,0.2)":"none",
                }}>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:isMobile?30:40,color:C.lightMint,lineHeight:1,marginBottom:10}}>{n}</div>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:13,color:C.lightMint,marginBottom:5,letterSpacing:"0.3px"}}>{label}</div>
                  <div style={{fontSize:12,color:"rgba(167,207,153,0.6)",lineHeight:1.4}}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Tabs */}
        <div style={{background:C.white,borderBottom:"1px solid rgba(15,27,31,0.08)"}}>
          <div style={{maxWidth:860,margin:"0 auto",display:"flex",overflowX:"auto",padding:"0 8px"}}>
            {TABS.map(({id,label,shortLabel})=>(
              <button key={id} onClick={()=>setTab(id)} style={{
                padding:isMobile?"18px 14px":"18px 22px",border:"none",background:"none",cursor:"pointer",
                whiteSpace:"nowrap",
                fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:13,
                color:tab===id?C.indigo:C.taupe,
                borderBottom:tab===id?`3px solid ${C.indigo}`:"3px solid transparent",
                transition:"color 0.15s",
              }}>
                {isMobile?shortLabel:label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{maxWidth:860,margin:"0 auto",padding:isMobile?"32px 16px 60px":"52px 32px 80px"}}>

        {/* ── OVERVIEW ── */}
        {tab==="guide"&&(
          <div style={{display:"flex",flexDirection:"column",gap:24}}>

            {/* Qualities + Contacts */}
            <FadeIn delay={0}>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
                <div style={{
                  background:C.indigo,borderRadius:16,padding:"24px",
                  boxShadow:"0 4px 24px rgba(57,75,153,0.08)",
                  borderLeft:`3px solid ${C.white}`,
                }}>
                  <SectionLabel>What we look for</SectionLabel>
                  {[
                    {icon:<Users size={14}/>,label:"Human",desc:"Warmth and compassion in how you work"},
                    {icon:<BookOpen size={14}/>,label:"Humble",desc:"Preferring learning to being right"},
                    {icon:<Check size={14}/>,label:"Accountable",desc:"Owning mistakes and delivering"},
                    {icon:<Star size={14}/>,label:"Innovative",desc:"Pushing for improvement"},
                    {icon:<Heart size={14}/>,label:"Resilient",desc:"Supporting each other through challenges"},
                  ].map(({icon,label,desc})=>(
                    <div key={label} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:14}}>
                      <div style={{color:C.lightLavender,marginTop:1,flexShrink:0}}>{icon}</div>
                      <div>
                        <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:13,color:C.lightLavender}}>{label} </span>
                        <span style={{fontSize:13,color:C.lightLavender,lineHeight:1.5}}>{desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{
                  background:C.white,borderRadius:16,padding:"24px",
                  border:"1px solid rgba(15,27,31,0.07)",
                  boxShadow:"0 2px 8px rgba(15,27,31,0.05)",
                  borderLeft:`3px solid ${C.indigo}`,
                }}>
                  <SectionLabel>Your contacts</SectionLabel>
                  {[
                    {label:"Manager, Talent Acquisition",name:"Caroline Colpini",href:"mailto:caroline.colpini@cartwheelcare.org"},
                    {label:"Coordinator",name:"Avery Henry",href:"mailto:avery.henry@cartwheelcare.org"},
                    ...(role.contacts?.find(c=>c.includes("Take-home"))
                      ? [{label:"Take-home Qs",name:"Jacob Savos"}]
                      : []),
                  ].map(({label,name,href})=>(
                    <div key={label} style={{marginBottom:14}}>
                      <div style={{fontSize:11,fontWeight:600,color:C.charcoal,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:3}}>{label}</div>
                      {href ? <a href={href} style={{fontSize:14,color:C.indigo,textDecoration:"none",fontWeight:600}}>{name}</a> : <span style={{fontSize:14,color:C.charcoal,fontWeight:600}}>{name}</span>}
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
                {q:"What is the compensation?",content:<p style={{fontSize:14,color:"#4a5568",lineHeight:1.75,margin:"12px 0 0"}}>{role.comp} plus competitive equity. You will discuss where you see yourself in that range during your recruiter screen.<span style={{fontSize:12,fontStyle:"italic",color:C.taupe}}> Compensation is determined by a number of factors including experience, qualifications, skills, and location.</span></p>},
                {q:"What does success look like?",content:(
                  <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8}}>
                    {(role.success||[]).map(({period,desc})=>(
                      <div key={period} style={{background:"rgba(240,236,233,0.6)",borderRadius:10,padding:"14px 16px"}}>
                        <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,color:C.indigo,marginBottom:5}}>{period}</div>
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

            <CandidateFooter/>
          </div>
        )}

        {/* ── CHAT ── */}
        {tab==="chat"&&(
          <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 280px)",minHeight:500}}>
            <FadeIn delay={0}>
              <div style={{
                background:C.charcoal,borderRadius:14,padding:"16px 20px",marginBottom:20,
                display:"flex",alignItems:"center",gap:12,
              }}>
                <div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <img src={cartwheelLogo} alt="Cartwheel" style={{width:22,height:22,objectFit:"contain"}}/>
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
                    <div style={{width:32,height:32,borderRadius:9,background:C.charcoal,border:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <img src={cartwheelLogo} alt="Cartwheel" style={{width:19,height:19,objectFit:"contain"}}/>
                    </div>
                  )}
                  <div style={{
                    maxWidth:"76%",padding:"13px 16px",
                    borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",
                    background:m.role==="user"?`linear-gradient(135deg, ${C.indigo}, #2d3d85)`:C.white,
                    color:m.role==="user"?C.white:C.charcoal,
                    fontSize:14,lineHeight:1.7,
                    fontFamily:"'Inter', sans-serif",
                    border:m.role==="assistant"?"1px solid rgba(15,27,31,0.08)":"none",
                    boxShadow:m.role==="user"?"0 2px 12px rgba(57,75,153,0.25)":"0 1px 4px rgba(15,27,31,0.06)",
                  }}>
                    {m.role==="assistant" ? renderMarkdown(m.content) : m.content}
                  </div>
                </div>
              ))}
              {loading&&(
                <div style={{display:"flex",alignItems:"flex-end",gap:10}}>
                  <div style={{width:32,height:32,borderRadius:9,background:C.charcoal,border:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}><img src={cartwheelLogo} alt="Cartwheel" style={{width:19,height:19,objectFit:"contain"}}/></div>
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
                  {(activeStage!==null&&_activeStageData
                    ? [
                        `What will ${_activeStageData.who} focus on in this stage?`,
                        `What stories should I prepare for my ${_activeStageData.stage}?`,
                        `What questions should I ask in this stage?`,
                        `What makes a strong answer in a ${_activeStageData.stage}?`,
                      ]
                    : ["What should I prepare for my first interview?","Who will I meet, and what do they focus on?","What does success look like in 90 days?","What's Cartwheel's culture actually like?"]
                  ).map((q,i)=>(
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
            {activeStage!==null&&(role.stages||[])[activeStage]&&(
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(57,75,153,0.06)",border:"1px solid rgba(57,75,153,0.18)",borderRadius:10,padding:"10px 14px",gap:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <BookMarked size={13} color={C.indigo}/>
                  <span style={{fontSize:13,color:C.indigo,fontWeight:600}}>Preparing for: {(role.stages||[])[activeStage].stage}</span>
                </div>
                <div style={{display:"flex",gap:8,flexShrink:0}}>
                  <button onClick={()=>setShowStagePicker(true)} style={{background:"none",border:"1px solid rgba(57,75,153,0.25)",borderRadius:8,padding:"5px 12px",fontSize:12,color:C.indigo,cursor:"pointer",fontFamily:"'Montserrat',sans-serif",fontWeight:600}}>Change</button>
                  <button onClick={()=>setShowBrief(true)} style={{background:`linear-gradient(135deg,${C.indigo},#2d3d85)`,border:"none",borderRadius:8,padding:"5px 12px",fontSize:12,color:C.white,cursor:"pointer",fontFamily:"'Montserrat',sans-serif",fontWeight:700,display:"flex",alignItems:"center",gap:5}}>
                    <BookMarked size={11}/> Get my brief
                  </button>
                </div>
              </div>
            )}
            <FadeIn delay={0}>
              <SectionHead>Interview Roadmap</SectionHead>
              <HintBanner storageKey="hint_roadmap" message="Tap any stage below to expand prep tips and questions to ask your interviewer." />
              {(role.roadmapNote
                ? role.roadmapNote.split("\n\n")
                : ["This process is designed to be mutual — you are evaluating us as much as we are evaluating you. Click any stage to see prep tips and questions to ask. Hover over an interviewer name for their focus area."]
              ).map((para,i)=>(
                <p key={i} style={{fontSize:14,color:"#4a5568",lineHeight:1.75,margin:"0 0 12px"}}>{para}</p>
              ))}
              <InterviewTimeline role={role} activeStage={activeStage}/>
              <p style={{fontSize:12,color:C.taupe,lineHeight:1.7,margin:"20px 0 0",fontStyle:"italic"}}>The interview process outlined here represents our general approach. Not all candidates will complete every stage, and the process may be adjusted based on role requirements or scheduling needs.</p>
            </FadeIn>

            <FadeIn delay={120}>
              <SectionHead>Set Yourself Up for Success</SectionHead>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
                {[
                  {icon:<Shield size={15} color="#394B99"/>, title:"Test Your Setup", body:"Most interviews are on Zoom. Before your interview, test the meeting link, audio, video, and internet connection. If joining by phone, make sure you have a strong cell connection."},
                  {icon:<Coffee size={15} color="#394B99"/>, title:"Choose Your Space", body:"Plan to join from a quiet, distraction-free environment. A computer or tablet is ideal. If you'd prefer not to show your surroundings, feel free to blur or use a Zoom background."},
                  {icon:<BookOpen size={15} color="#394B99"/>, title:"Do a Little Homework", body:"Review the job description and think of a few stories from your past work that highlight your skills. Look up your interviewer on LinkedIn and bring questions — this is your chance to interview us too."},
                  {icon:<Star size={15} color="#394B99"/>, title:"Dress Your Way", body:"We value authenticity and want you to feel like yourself. Wear whatever makes you feel your best and ready to engage."},
                ].map(({icon,title,body},i)=>(
                  <div key={i} style={{background:C.white,borderRadius:12,padding:"18px 20px",border:"1px solid rgba(15,27,31,0.07)",boxShadow:"0 1px 4px rgba(15,27,31,0.05)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <div style={{width:28,height:28,borderRadius:8,background:"rgba(57,75,153,0.08)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{icon}</div>
                      <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:13,color:C.charcoal}}>{title}</span>
                    </div>
                    <p style={{fontSize:13,color:"#4a5568",lineHeight:1.65,margin:0}}>{body}</p>
                  </div>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={160}>
              <SectionHead>Is This Role a Fit?</SectionHead>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
                <div style={{background:`linear-gradient(160deg, ${C.indigo} 0%, #2d3d85 100%)`,borderRadius:14,padding:"28px",boxShadow:"0 4px 20px rgba(57,75,153,0.25)"}}>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:11,color:"rgba(177,165,247,0.7)",marginBottom:16,letterSpacing:"1px",textTransform:"uppercase"}}>You'll thrive if you</div>
                  {(role.thrive||[]).map((t,i)=>(
                    <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:12}}>
                      <Check size={13} color={C.lightLavender} style={{flexShrink:0,marginTop:2}}/>
                      <span style={{fontSize:13,color:"rgba(255,255,255,0.85)",lineHeight:1.6}}>{t}</span>
                    </div>
                  ))}
                </div>
                <div style={{background:C.brick,borderRadius:14,padding:"22px",border:"1px solid rgba(15,27,31,0.07)"}}>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:11,color:C.lightPeach,marginBottom:14,letterSpacing:"1px",textTransform:"uppercase"}}>This may not be right if you</div>
                  {(role.notfor||[]).map((t,i)=>(
                    <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
                      <X size={13} color={C.peach} style={{flexShrink:0,marginTop:2}}/>
                      <span style={{fontSize:13,color:"rgba(255,255,255,0.8)",lineHeight:1.55}}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* My Notes Aggregator */}
            {(()=>{
              const allNotes=(role.stages||[]).map((s,i)=>({
                stage:s.stage,
                text:(()=>{try{return localStorage.getItem(`notes-${role.slug}-${i}`)||"";}catch{return "";}})(),
              })).filter(n=>n.text);
              if(allNotes.length===0) return null;
              return (
                <FadeIn delay={280}>
                  <SectionHead>My Notes</SectionHead>
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    {allNotes.map(({stage,text},i)=>(
                      <div key={i} style={{background:C.white,borderRadius:12,padding:"18px 20px",border:"1px solid rgba(15,27,31,0.07)"}}>
                        <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:11,color:C.taupe,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:8}}>{stage}</div>
                        <div style={{fontSize:14,color:C.charcoal,lineHeight:1.65,whiteSpace:"pre-wrap"}}>{text}</div>
                      </div>
                    ))}
                  </div>
                </FadeIn>
              );
            })()}

            <CandidateFooter/>
          </div>
        )}

        {/* ── CULTURE ── */}
        {tab==="culture"&&(
          <div style={{display:"flex",flexDirection:"column",gap:36}}>

            <FadeIn delay={0}>
              <WhyCartwheel/>
            </FadeIn>

            {/* What sets us apart */}
            <FadeIn delay={60}>
              <div style={{
                background:`linear-gradient(135deg, ${C.indigo} 0%, #2d3d7a 100%)`,
                borderRadius:16,padding:"32px",
                boxShadow:"0 8px 32px rgba(15,27,31,0.15)",
              }}>
                <SectionLabel light>What sets us apart</SectionLabel>
                <p style={{fontSize:15,color:"rgba(255,255,255,0.75)",lineHeight:1.75,margin:"0 0 24px"}}>
                  It's not just the impact we deliver in schools — it's also how we work. Fully remote, transparent, and human-first, with leaders who model vulnerability and a team that celebrates connection.
                </p>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {[
                    {icon:<Sun size={16}/>,title:"Our rituals matter",desc:`We share "sunbeams" that remind us why we're here. We spotlight teammates in "Humans of Cartwheel" to celebrate the whole person.`},
                    {icon:<Shield size={16}/>,title:"Transparency is the norm",desc:"Leadership shares financials and strategic debates openly — including mistakes and uncertainties — because that's how we all get better."},
                    {icon:<Heart size={16}/>,title:"Vulnerability is strength",desc:"Founders model it first: admitting when they're wrong, asking for feedback, showing up as whole humans. That permission creates space for everyone."},
                  ].map(({icon,title,desc})=>(
                    <div key={title} style={{background:"rgba(255,255,255,0.08)",borderRadius:12,padding:"22px 24px",borderLeft:`3px solid ${C.lavender}`}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <span style={{color:C.lavender,display:"flex"}}>{icon}</span>
                        <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:15,color:C.white}}>{title}</div>
                      </div>
                      <div style={{fontSize:14,color:"rgba(255,255,255,0.65)",lineHeight:1.75}}>{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* What type of person thrives here */}
            <FadeIn delay={80}>
              <div>
                <h2 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:28,color:C.charcoal,margin:"0 0 24px",letterSpacing:"-0.5px"}}>What Type of Person Thrives Here?</h2>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {[
                    ["collaborative problem-solver","You're a collaborative problem-solver who thrives in ambiguity"],
                    ["growth mindset","You practice a growth mindset and embrace feedback"],
                    ["mission-driven","You care deeply about mission-driven work"],
                    ["wearing multiple hats","You're comfortable wearing multiple hats as we scale"],
                    ["build","You want to build something that outlasts your tenure"],
                  ].map(([bold,text],i)=>{
                    const parts=text.split(bold);
                    return (
                      <div key={i} style={{padding:"18px 24px",borderLeft:`4px solid ${C.lavender}`,background:C.white,borderRadius:"0 10px 10px 0"}}>
                        <span style={{fontSize:15,color:C.charcoal,lineHeight:1.7}}>
                          {parts[0]}<strong style={{color:C.indigo,fontWeight:700}}>{bold}</strong>{parts[1]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </FadeIn>

            {/* Comp + Benefits */}
            <FadeIn delay={100}>
              <SectionHead>Compensation + Benefits</SectionHead>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:12,marginBottom:14}}>
                {[
                  {icon:<Coffee size={14}/>,title:"401(k) Match",sub:"2% employer contribution"},
                  {icon:<Heart size={14}/>,title:"Premium Health",sub:"Medical, dental, orthodontia, vision"},
                  {icon:<Users size={14}/>,title:"Paid Parental Leave",sub:"12 weeks after 1 year of tenure"},
                  {icon:<Plane size={14}/>,title:"Annual Retreat",sub:"Connect with teammates IRL"},
                  {icon:<BookMarked size={14}/>,title:"Prof. Development",sub:"$500 annual stipend"},
                  {icon:<Calendar size={14}/>,title:"Generous PTO",sub:"Including company closure 12/25-1/1"},
                ].map(({icon,title,sub})=>(
                  <div key={title} style={{background:C.lightMint,borderRadius:12,padding:"22px 18px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                      <span style={{color:C.forest,display:"flex"}}>{icon}</span>
                      <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:14,color:C.forest}}>{title}</div>
                    </div>
                    <div style={{fontSize:13,color:C.forest,lineHeight:1.5,opacity:0.75}}>{sub}</div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:13,color:C.taupe,paddingLeft:4}}>MacBook provided &bull; Flexible remote-first</div>
            </FadeIn>

            {/* Get to Know Us Better */}
            <FadeIn delay={120}>
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
                    boxShadow:"0 1px 3px rgba(15,27,31,0.05)",transition:"all 0.15s ease",
                  }}>
                    <span style={{color:C.indigo}}>{icon}</span>{label}
                  </a>
                ))}
              </div>
            </FadeIn>

            <CandidateFooter/>
          </div>
        )}

        {/* ── CHECKLIST ── */}
        {tab==="checklist"&&(
          <div>
            <FadeIn delay={0}>
              <SectionHead>Your Prep Checklist</SectionHead>
              <HintBanner storageKey="hint_checklist" message="Tap any item to check it off — your progress saves automatically to this browser." />
              <p style={{fontSize:14,color:"#4a5568",lineHeight:1.75,margin:"0 0 20px"}}>Work through each stage at your own pace. You don't need to complete everything — focus on the rounds coming up next.</p>
              <PrepChecklist role={role} activeStage={activeStage}/>
            </FadeIn>
            <CandidateFooter/>
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
                <div style={{background:C.white,borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",padding:"28px 32px",border:"1px solid transparent",transition:"border-color 0.15s ease"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=C.lightLavender}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="transparent"}
                >
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
                      <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,color:C.indigo,marginBottom:8,letterSpacing:"0.3px"}}>{sub.label}</div>
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

            {role.applyUrl&&(
              <FadeIn delay={350}>
                <div style={{display:"flex",justifyContent:"center"}}>
                  <a href={role.applyUrl} target="_blank" rel="noopener noreferrer" onClick={()=>{ track("apply_clicked",{role_page:role.slug,role_family:role.department}); trackApplyClicked(); }} style={{
                    display:"inline-flex",alignItems:"center",gap:8,
                    background:`linear-gradient(135deg, ${C.indigo}, #4f63c4)`,
                    color:C.white,borderRadius:10,padding:"14px 32px",
                    fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:15,
                    textDecoration:"none",letterSpacing:"-0.2px",
                    boxShadow:"0 4px 16px rgba(57,75,153,0.3)",
                    transition:"transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(57,75,153,0.4)";}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 4px 16px rgba(57,75,153,0.3)";}}
                  >
                    Apply Now
                  </a>
                </div>
              </FadeIn>
            )}

            <CandidateFooter/>
          </div>
        )}

        {/* ── MY NOTES ── */}
        {tab==="notes"&&(
          <div style={{display:"flex",flexDirection:"column",gap:24}}>
            <FadeIn delay={0}>
              <SectionHead>My Notes</SectionHead>
              <p style={{fontSize:14,color:"#4a5568",lineHeight:1.75,margin:"0 0 24px"}}>Your notes are saved automatically to this browser. Use this space however works for you — questions to ask, things to research, thoughts after each conversation.</p>
              {(()=>{
                const generalKey=`notes-${role.slug}-general`;
                return <GeneralNotes noteKey={generalKey}/>;
              })()}
            </FadeIn>
            {(role.stages||[]).length>0&&(
              <FadeIn delay={60}>
                <div style={{marginTop:8}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.taupe,letterSpacing:"1px",textTransform:"uppercase",marginBottom:16,fontFamily:"'Montserrat',sans-serif"}}>Notes by Interview Stage</div>
                  <div style={{display:"flex",flexDirection:"column",gap:16}}>
                    {(role.stages||[]).map((s,i)=>(
                      <div key={i} style={{background:C.white,borderRadius:12,border:"1px solid rgba(15,27,31,0.08)",padding:"18px 20px"}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.charcoal,marginBottom:2,fontFamily:"'Montserrat',sans-serif"}}>{s.stage}</div>
                        {s.who&&<div style={{fontSize:12,color:C.taupe,marginBottom:8}}>{s.who}</div>}
                        <PrepNotes slug={role.slug} stageIndex={i}/>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            )}
            <CandidateFooter/>
          </div>
        )}

      </div>
      {showStagePicker&&(
        <StagePickerModal role={role} activeStage={activeStage} onSelect={handleStageSelect} onClose={()=>setShowStagePicker(false)}/>
      )}
      {showBrief&&activeStage!==null&&(
        <BriefModal role={role} stageIndex={activeStage} onClose={()=>setShowBrief(false)} isMobile={isMobile}/>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes blink { 0%,100%{opacity:0.2} 50%{opacity:1} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes tooltipIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes timelinePulse { 0%,100%{transform:scale(1);opacity:0.35} 50%{transform:scale(1.6);opacity:0} }
        @keyframes ringPulse { 0%{stroke:#394B99} 40%{stroke:#A7CF99} 100%{stroke:#394B99} }
        @keyframes chevronPulse { 0%,100%{transform:translateY(0)} 50%{transform:translateY(3px)} }
        @keyframes dotGlow { 0%,100%{box-shadow:0 0 0 3px rgba(167,207,153,0.35)} 50%{box-shadow:0 0 0 5px rgba(167,207,153,0.6)} }
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
    <div style={{minHeight:"100vh",background:"#F7F8FA",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}>
      <div style={{
        background:C.white,
        borderRadius:20,border:"1px solid rgba(15,27,31,0.08)",
        padding:"48px 44px",width:"100%",maxWidth:380,textAlign:"center",
        boxShadow:"0 8px 32px rgba(15,27,31,0.08)",
        animation:shake?"shake 0.4s ease":"none",
      }}>
        <div style={{marginBottom:24,display:"flex",justifyContent:"center"}}><img src={cartwheelLogo} alt="Cartwheel" style={{width:56,height:56,objectFit:"contain"}}/></div>
        <h1 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:20,color:C.charcoal,margin:"0 0 6px"}}>Admin Access</h1>
        <p style={{fontSize:13,color:C.taupe,margin:"0 0 28px"}}>Candidate Copilot Platform</p>
        <div style={{position:"relative",marginBottom:error?8:20}}>
          <Lock size={14} color={C.taupe} style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)"}}/>
          <input type="password" value={pw}
            onChange={e=>{setPw(e.target.value);setError(false);}}
            onKeyDown={e=>e.key==="Enter"&&attempt()}
            placeholder="Enter password"
            style={{
              width:"100%",padding:"12px 14px 12px 38px",
              background:C.white,
              border:`1px solid ${error?"rgba(235,168,155,0.6)":"rgba(15,27,31,0.12)"}`,
              borderRadius:10,fontSize:14,color:C.charcoal,
              fontFamily:"inherit",outline:"none",boxSizing:"border-box",
              transition:"border-color 0.2s",
            }}/>
        </div>
        {error&&<p style={{fontSize:12,color:"#c0392b",margin:"0 0 16px"}}>Incorrect password. Please try again.</p>}
        <button onClick={attempt} style={{
          width:"100%",
          background:`linear-gradient(135deg, ${C.indigo}, #2d3d85)`,
          color:C.white,border:"none",borderRadius:10,padding:"13px",
          fontSize:13,fontFamily:"'Montserrat',sans-serif",fontWeight:700,
          cursor:"pointer",boxShadow:"0 4px 16px rgba(57,75,153,0.25)",
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
    <div style={{fontFamily:"'Inter',sans-serif",minHeight:"100vh",background:"#F7F8FA",color:C.charcoal}}>

      {/* Admin header */}
      <div style={{padding:"16px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(15,27,31,0.08)",background:C.white}}>
        <Wordmark/>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <span style={{fontSize:12,color:C.taupe,fontFamily:"'Montserrat',sans-serif",letterSpacing:"0.5px"}}>Admin</span>
          <button onClick={onLogout} style={{
            display:"flex",alignItems:"center",gap:6,
            fontSize:12,color:C.taupe,background:"rgba(15,27,31,0.04)",
            border:"1px solid rgba(15,27,31,0.1)",borderRadius:8,padding:"6px 12px",
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
                <h1 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:24,color:C.charcoal,margin:"0 0 6px",letterSpacing:"-0.4px"}}>Active Roles</h1>
                <p style={{fontSize:14,color:C.taupe,margin:0}}>{allRoles.length} role{allRoles.length!==1?"s":""} published</p>
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
                  background:C.white,borderRadius:14,
                  border:"1px solid rgba(15,27,31,0.08)",padding:"20px 24px",
                  display:"flex",justifyContent:"space-between",alignItems:"center",
                  flexWrap:"wrap",gap:12,
                  transition:"background 0.2s",
                  boxShadow:"0 1px 4px rgba(15,27,31,0.04)",
                }}>
                  <div>
                    <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:16,color:C.charcoal,marginBottom:4}}>{role.title}</div>
                    <div style={{fontSize:13,color:C.taupe,marginBottom:8}}>{role.department} &bull; {role.location} &bull; {role.comp}</div>
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
                      background:copied===role.slug?"rgba(38,84,79,0.08)":"rgba(15,27,31,0.04)",
                      color:copied===role.slug?C.forest:"rgba(15,27,31,0.5)",
                      border:`1px solid ${copied===role.slug?"rgba(38,84,79,0.25)":"rgba(15,27,31,0.1)"}`,
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
            <button onClick={()=>setStep("list")} style={{background:"none",border:"none",color:C.taupe,fontSize:13,fontWeight:600,cursor:"pointer",padding:"0 0 24px",fontFamily:"'Montserrat',sans-serif",display:"flex",alignItems:"center",gap:6}}>
              <ArrowLeft size={13}/> Back to roles
            </button>
            <h1 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:22,color:C.charcoal,margin:"0 0 8px",letterSpacing:"-0.4px"}}>Add New Role</h1>
            <p style={{fontSize:14,color:C.taupe,margin:"0 0 28px",lineHeight:1.6}}>Paste your hiring package below. Claude will extract structured data and generate the candidate experience automatically.</p>
            <div style={{background:C.white,borderRadius:14,border:"1px solid rgba(15,27,31,0.08)",overflow:"hidden",marginBottom:16,boxShadow:"0 1px 4px rgba(15,27,31,0.04)"}}>
              <div style={{padding:"12px 18px",borderBottom:"1px solid rgba(15,27,31,0.06)",fontSize:11,fontWeight:700,color:C.taupe,letterSpacing:"1px",textTransform:"uppercase",fontFamily:"'Montserrat',sans-serif"}}>Hiring Package</div>
              <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)}
                placeholder="Paste job description, success profile, interview plan, interviewer details, compensation..."
                style={{width:"100%",minHeight:300,padding:"18px",border:"none",outline:"none",fontSize:14,lineHeight:1.7,color:C.charcoal,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box",background:"transparent"}}/>
            </div>
            {parseError&&<div style={{background:"rgba(92,30,55,0.06)",borderRadius:8,padding:"12px 16px",fontSize:13,color:C.brick,marginBottom:16,border:"1px solid rgba(92,30,55,0.2)"}}>{parseError}</div>}
            <button onClick={handleParse} disabled={!pasteText.trim()||parsing} style={{
              background:pasteText.trim()&&!parsing?`linear-gradient(135deg, ${C.indigo}, #2d3d85)`:"rgba(15,27,31,0.06)",
              color:pasteText.trim()&&!parsing?C.white:"rgba(15,27,31,0.3)",
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
            <button onClick={()=>setStep("paste")} style={{background:"none",border:"none",color:C.taupe,fontSize:13,fontWeight:600,cursor:"pointer",padding:"0 0 24px",fontFamily:"'Montserrat',sans-serif",display:"flex",alignItems:"center",gap:6}}>
              <ArrowLeft size={13}/> Back to paste
            </button>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,flexWrap:"wrap",gap:12}}>
              <div>
                <h1 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:22,color:C.charcoal,margin:"0 0 6px",letterSpacing:"-0.4px"}}>Review Parsed Data</h1>
                <p style={{fontSize:14,color:C.taupe,margin:0}}>Review before publishing. Click any field to edit.</p>
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
                <div key={key} style={{background:C.white,borderRadius:10,border:"1px solid rgba(15,27,31,0.08)",padding:"14px 16px",boxShadow:"0 1px 3px rgba(15,27,31,0.04)"}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:C.taupe,marginBottom:6,fontFamily:"'Montserrat',sans-serif"}}>{label}</div>
                  {editField===key?(
                    <input autoFocus defaultValue={val}
                      onBlur={e=>{setParsed(p=>({...p,[key]:e.target.value}));setEditField(null);}}
                      style={{width:"100%",background:C.sand,border:"1px solid rgba(57,75,153,0.3)",borderRadius:6,padding:"6px 10px",fontSize:14,color:C.charcoal,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                  ):(
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                      <span style={{fontSize:14,color:C.charcoal,fontWeight:500}}>{val}</span>
                      <button onClick={()=>setEditField(key)} style={{fontSize:11,color:C.indigo,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Edit</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{background:C.white,borderRadius:10,border:"1px solid rgba(15,27,31,0.08)",padding:"16px",marginBottom:12,boxShadow:"0 1px 3px rgba(15,27,31,0.04)"}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:C.taupe,marginBottom:10,fontFamily:"'Montserrat',sans-serif"}}>Mission</div>
              <p style={{fontSize:14,color:"rgba(15,27,31,0.6)",lineHeight:1.7,margin:0,fontStyle:"italic"}}>{parsed.mission}</p>
            </div>

            <div style={{background:C.white,borderRadius:10,border:"1px solid rgba(15,27,31,0.08)",padding:"16px",marginBottom:20,boxShadow:"0 1px 3px rgba(15,27,31,0.04)"}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:C.taupe,marginBottom:12,fontFamily:"'Montserrat',sans-serif"}}>Interview Stages ({parsed.stages?.length})</div>
              {(parsed.stages||[]).map((s,i)=>(
                <div key={i} style={{display:"flex",gap:12,padding:"8px 0",borderBottom:i<(parsed.stages.length-1)?"1px solid rgba(15,27,31,0.05)":"none",alignItems:"center"}}>
                  <span style={{background:"rgba(57,75,153,0.08)",color:C.indigo,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,fontFamily:"'Montserrat',sans-serif",whiteSpace:"nowrap"}}>{s.time}</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.charcoal}}>{s.stage}</div>
                    <div style={{fontSize:12,color:C.taupe}}>{s.who} &bull; {s.focus}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{background:"rgba(38,84,79,0.06)",borderRadius:10,padding:"14px 18px",fontSize:13,color:C.forest,lineHeight:1.6,border:"1px solid rgba(38,84,79,0.15)"}}>
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
  const [adminAuthed,setAdminAuthed]=useState(()=>localStorage.getItem('adminAuthed')==='1');
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
  const handleLogout=()=>{setAdminAuthed(false);localStorage.removeItem('adminAuthed');};

  if(!loaded) return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.charcoal,fontFamily:"'Inter',sans-serif"}}>
      <div style={{textAlign:"center",animation:"fadeUp 0.5s ease both"}}>
        <img src={cartwheelLogo} alt="Cartwheel" style={{width:52,height:52,objectFit:"contain"}}/>
        <div style={{marginTop:16,fontSize:13,color:"rgba(255,255,255,0.3)",fontFamily:"'Montserrat',sans-serif",letterSpacing:"0.5px"}}>Loading</div>
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );

  if(view==="candidate"&&activeRole) return <CandidateView role={activeRole} onBack={adminAuthed?handleBack:null}/>;
  if(view==="admin"&&!adminAuthed) return <AdminLogin onSuccess={()=>{setAdminAuthed(true);localStorage.setItem('adminAuthed','1');}}/>;
  if(view==="admin"&&adminAuthed) return <AdminDashboard allRoles={allRoles} onPublish={handlePublish} onPreview={handlePreview} onDelete={handleDelete} onLogout={handleLogout}/>;
  return null;
}
