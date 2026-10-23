import { useEffect, useMemo, useState } from 'react';
import { ApiError, communitiesApi, postsApi, type ApiPost } from './lib/api';
import { Home, Compass, Users, MessageCircle, Bell, Bookmark, CalendarDays, Settings, Search, Plus, Heart, MessageSquare, Share2, MoreHorizontal, Sparkles, Send, X, Check, UserPlus, Hash, Menu, ShieldCheck, ArrowUpRight, Star, BellDot, ImagePlus, MapPinned, SlidersHorizontal, ArrowRight, BookmarkPlus, CirclePlay, BriefcaseBusiness, BadgeCheck } from 'lucide-react';

type Post={id:number;name:string;handle:string;avatar:string;color:string;time:string;text:string;tags:string[];likes:number;comments:number;liked:boolean;saved:boolean};
type Person={name:string;handle:string;avatar:string;color:string;role:string;interests:string[];match:number;followed:boolean};
const seedPosts:Post[]=[
{id:1,name:'Aarav Mehta',handle:'aaravbuilds',avatar:'AM',color:'coral',time:'12 min ago',text:'Finally shipped my first AI side project! 🚀 Built a little assistant that turns messy notes into clean product ideas. The best part? It feels like having a second brain for my ideas.',tags:['AI','Shipping'],likes:128,comments:24,liked:false,saved:true},
{id:2,name:'Priya Sharma',handle:'priyadesigns',avatar:'PS',color:'lavender',time:'38 min ago',text:'A reminder for fellow designers: your first draft doesn’t need to be brilliant. It needs to exist. The polish comes later—just start somewhere.',tags:['Design','Mindset'],likes:96,comments:18,liked:true,saved:false},
{id:3,name:'Rohan Iyer',handle:'rohan.codes',avatar:'RI',color:'mint',time:'1 hr ago',text:'Weekend challenge: build something useful in 2 hours, no tutorials allowed. Mine is a tiny habit tracker. What will you prototype this weekend?',tags:['Build in public','Challenge'],likes:142,comments:31,liked:false,saved:true},
{id:4,name:'Naina Verma',handle:'nainawrites',avatar:'NV',color:'sky',time:'2 hr ago',text:'Booked a cozy coffee spot for a creative sprint tomorrow. Nothing like a new environment to reset the brain and get unstuck.',tags:['Creativity','Routine'],likes:76,comments:12,liked:false,saved:false}];
const seedPeople:Person[]=[
{name:'Ananya Rao',handle:'ananyacreates',avatar:'AR',color:'mint',role:'Product Designer · Building in public',interests:['UX Design','Startups','AI'],match:96,followed:false},
{name:'Vikram Patel',handle:'vikram.codes',avatar:'VP',color:'coral',role:'Full-stack developer · Open-source fan',interests:['React','Java','Open Source'],match:91,followed:false},
{name:'Meera Kapoor',handle:'meeramakes',avatar:'MK',color:'lavender',role:'AI enthusiast · Lifelong learner',interests:['Machine Learning','Python','Reading'],match:88,followed:false},
{name:'Arjun Nair',handle:'arjunfounder',avatar:'AN',color:'sky',role:'Indie founder · Community builder',interests:['Startups','Product','Writing'],match:84,followed:true}];
const circles=[{name:'AI Builders',tag:'AI',members:'12.4k',description:'Share experiments, ship projects, and learn AI together.',color:'lavender',icon:'✳'},{name:'Frontend Friends',tag:'Development',members:'8.1k',description:'Tiny wins, real code, and good design energy.',color:'mint',icon:'◌'},{name:'Creative Corner',tag:'Culture',members:'5.3k',description:'Art, storytelling, and thoughtful creativity for the week.',color:'coral',icon:'✦'},{name:'Startup Circle',tag:'Growth',members:'3.9k',description:'Founder stories, momentum, and early-stage lessons.',color:'sky',icon:'◎'}];
const nav=[{label:'Home',icon:Home},{label:'Discover',icon:Compass},{label:'Communities',icon:Users},{label:'Messages',icon:MessageCircle},{label:'Notifications',icon:Bell}];
function Avatar({text,color,size='md'}:{text:string;color:string;size?:'sm'|'md'|'lg'}){return <div className={'avatar '+color+' '+size}>{text}</div>}
function App(){
 const [active,setActive]=useState('Home');
 const [posts,setPosts]=useState<Post[]>(()=>{try{return JSON.parse(localStorage.getItem('circleup-posts')||'null')||seedPosts}catch{return seedPosts}});
 const [feedLoading,setFeedLoading]=useState(true);
 const [people,setPeople]=useState<Person[]>(()=>{try{return JSON.parse(localStorage.getItem('circleup-people')||'null')||seedPeople}catch{return seedPeople}});
 const [joined,setJoined]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem('circleup-joined')||'null')||['AI Builders','Creative Corner']}catch{return ['AI Builders','Creative Corner']}});
 const [communityIds,setCommunityIds]=useState<Record<string,number>>({});
 const [search,setSearch]=useState('');
 const [draft,setDraft]=useState('');
 const [showComposer,setShowComposer]=useState(false);
 const [mobileNav,setMobileNav]=useState(false);
 const [toast,setToast]=useState('');
 const [chat,setChat]=useState('');
 const [chatMessages,setChatMessages]=useState<string[]>(['Hi! Looking for thoughtful people or a fresh idea?']);
 const [comments,setComments]=useState<Record<number,string[]>>({1:['Love this. Shipping is the real flex.'],3:['This is exactly the kind of challenge I need!']});
 const [commentDrafts,setCommentDrafts]=useState<Record<number,string>>({});
 const mapApiPost=(p:ApiPost):Post=>({id:Number(p.id),name:p.name||'CircleUp member',handle:(p.name||'member').toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,24)||'member',avatar:(p.name||'CU').split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase(),color:'indigo',time:new Date(p.created_at).toLocaleString(),text:p.body,tags:[],likes:p.likes||0,comments:p.comments||0,liked:Boolean((p as ApiPost & {liked_by_me?:boolean}).liked_by_me),saved:false});
 useEffect(()=>{let cancelled=false;postsApi.list().then(remotePosts=>{if(!cancelled){setPosts(remotePosts.map(mapApiPost));setFeedLoading(false);}}).catch(()=>{if(!cancelled)setFeedLoading(false);});return()=>{cancelled=true;}},[]);
 useEffect(()=>{localStorage.setItem('circleup-people',JSON.stringify(people))},[people]);
 useEffect(()=>{localStorage.setItem('circleup-joined',JSON.stringify(joined))},[joined]);
 useEffect(()=>{let cancelled=false;communitiesApi.list().then(items=>{if(!cancelled){setCommunityIds(Object.fromEntries(items.map(item=>[item.name,Number(item.id)])));setJoined(items.filter(item=>(item as typeof item & {joined_by_me?:boolean}).joined_by_me).map(item=>item.name));}}).catch(()=>{});return()=>{cancelled=true;}},[]);
 const toggleCommunity=async(name:string)=>{const id=communityIds[name];if(!id){notify('This community is not available from the API yet.');return;}try{const result=await communitiesApi.toggleMembership(id);setJoined(items=>result.joined?[...items.filter(item=>item!==name),name]:items.filter(item=>item!==name));notify(result.joined?'Joined '+name:'Left '+name);}catch(error){notify(error instanceof ApiError?error.message:'Could not update community membership. Please try again.');}};
 const notify=(s:string)=>{setToast(s);window.setTimeout(()=>setToast(''),2300)};
 const filteredPeople=useMemo(()=>people.filter(p=>(p.name+' '+p.role+' '+p.interests.join(' ')).toLowerCase().includes(search.toLowerCase())),[people,search]);
 const visiblePosts=useMemo(()=>{const list=posts.filter(p=>!search||p.text.toLowerCase().includes(search.toLowerCase())||p.tags.some(tag=>tag.toLowerCase().includes(search.toLowerCase()))); return list.length?list:posts;},[posts,search]);
 const toggleLike=async(id:number)=>{const post=posts.find(p=>p.id===id);if(!post)return;try{const result=await postsApi.toggleLike(id);setPosts(ps=>ps.map(p=>p.id===id?{...p,liked:result.liked,likes:Math.max(0,p.likes+(result.liked?1:-1))}:p));}catch(error){notify(error instanceof ApiError?error.message:'Could not update like. Please try again.');}};
 const toggleSave=(id:number)=>setPosts(ps=>ps.map(p=>p.id===id?{...p,saved:!p.saved}:p));
 const createPost=async()=>{const body=draft.trim();if(!body)return;try{const created=await postsApi.create(body);setPosts(ps=>[mapApiPost({...created,likes:0,comments:0}),...ps]);setDraft('');setShowComposer(false);notify('Post shared to your network');}catch(error){notify(error instanceof ApiError?error.message:'Could not publish your post. Please try again.');}};
 const sendComment=async(id:number)=>{const value=(commentDrafts[id]||'').trim();if(!value)return;try{const comment=await postsApi.addComment(id,value);setComments(c=>({...c,[id]:[...(c[id]||[]),comment.body]}));setPosts(ps=>ps.map(p=>p.id===id?{...p,comments:p.comments+1}:p));setCommentDrafts(d=>({...d,[id]:''}));}catch(error){notify(error instanceof ApiError?error.message:'Could not send comment. Please try again.');}};
 const sendChat=()=>{if(!chat.trim())return;setChatMessages(m=>[...m,chat.trim()]);setChat('');window.setTimeout(()=>setChatMessages(m=>[...m,'That sounds interesting! Explore Discover and communities to keep the momentum going.']),350);};
 const title=active==='Home'?'Your corner of the internet':active==='Discover'?'Find your people':active==='Communities'?'Your communities':active==='Messages'?'Your conversations':active==='Notifications'?'Recent activity':active==='Saved'?'Your little collection':active==='Events'?'Good people, good plans':active==='Profile'?'Your profile':active==='Settings'?'Privacy & safety':'Your corner of the internet';
 return (
  <>
   <style>{`
    @media (max-width: 600px) {
      .mobile-search {
        display: flex !important;
        width: 100% !important;
        min-width: 0;
      }
      .mobile-search input {
        display: block !important;
        width: 100% !important;
        opacity: 1 !important;
      }
      .mobile-bottom-nav button {
        min-width: 44px;
        min-height: 44px;
      }
    }
   `}</style>
   <div className="app-shell">
    <aside className={'sidebar '+(mobileNav?'mobile-open':'')}>
     <div className="brand"><div className="brand-mark"><Sparkles size={21}/></div><span>circleup<span className="brand-dot">.</span></span></div>
     <div className="sidebar-top">
      <button className="nav-link active" onClick={()=>setActive('Home')}><Home size={16}/><span>Home</span></button>
      <button className="nav-link" onClick={()=>setActive('Discover')}><Compass size={16}/><span>Discover</span></button>
      <button className="nav-link" onClick={()=>setActive('Communities')}><Users size={16}/><span>Communities</span></button>
      <button className="nav-link" onClick={()=>setActive('Messages')}><MessageCircle size={16}/><span>Messages</span></button>
      <button className="nav-link" onClick={()=>setActive('Notifications')}><Bell size={16}/><span>Notifications</span></button>
      <button className="nav-link" onClick={()=>setActive('Saved')}><Bookmark size={16}/><span>Saved</span></button>
     </div>
     <button className="profile-mini" onClick={()=>{setActive('Profile');setMobileNav(false)}}><Avatar text="KS" color="indigo"/><span><b>Kandi Sai Kishore</b><small>@saikishore</small></span><MoreHorizontal size={16}/></button>
     <div className="sidebar-bottom"><div className="nav-label">YOUR CIRCLES</div>{circles.slice(0,3).map(c=><button className="circle-link" key={c.name} onClick={()=>setActive('Communities')}><span className={'circle-badge '+c.color}>{c.icon}</span><div><strong>{c.name}</strong><small>{c.tag}</small></div></button>)}</div>
    </aside>
    <main className="main-area">
     <header className="topbar">
      <button type="button" className="icon-btn mobile-menu" aria-label="Open navigation menu" onClick={()=>setMobileNav(true)}><Menu/></button>
      <div className="breadcrumb">Your space <span>/</span> {active}</div>
      <div className="top-actions">
       <div className="search-box mobile-search">
        <Search size={15}/>
        <input aria-label="Search people, interests, or circles" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search people, topics..." />
       </div>
       <button className="icon-btn" aria-label="Create a post" onClick={()=>setShowComposer(true)}><Plus size={17}/></button>
       <button className="icon-btn" aria-label="Open notifications" onClick={()=>setActive('Notifications')}><BellDot size={17}/></button>
      </div>
     </header>
     <div className="content-wrap">
      <div className="page-heading">
       <div>
        <p className="eyebrow">A LITTLE SPACE TO BE YOU</p>
        <h1>{title}</h1>
        <p className="page-subtitle">{active==='Home'?'Ideas, people, and the spark that keeps the week moving.':active==='Discover'?'People who match your energy and curiosity.':active==='Communities'?'Small circles. Shared curiosity. Big momentum.':active==='Messages'?'Your conversations, ready when you are.':'Stay close to what matters most.'}</p>
       </div>
       <button className="primary-btn" onClick={()=>setShowComposer(true)}><Plus size={16}/> Create post</button>
      </div>
      {active==='Home'&&<div className="dashboard-grid"><section className="feed-column"><div className="welcome-card"><div><span className="welcome-kicker">MONDAY, MADE BETTER ✨</span><h2>Hey, Kishore — what’s your spark today?</h2></div><button className="secondary-btn" onClick={()=>setShowComposer(true)}><Plus size={16}/> Share an update</button></div>{feedLoading&&<p role="status" className="empty-state">Loading community posts…</p>}{!feedLoading&&visiblePosts.map(p=><article className="post-card" key={p.id} id={'post-'+p.id}><div className="post-top"><Avatar text={p.avatar} color={p.color}/><div className="post-author"><b>{p.name}</b><span>@{p.handle} · {p.time}</span></div><button className="ghost-btn" aria-label={'More options for '+p.name}><MoreHorizontal size={16}/></button></div><p className="post-text">{p.text}</p>{p.tags.length>0&&<div className="tags">{p.tags.map(tag=><span key={tag} className="tag">#{tag}</span>)}</div>}<div className="post-actions"><button className={'action-btn '+(p.liked?'active':'')} onClick={()=>toggleLike(p.id)} aria-label={p.liked?'Unlike post':'Like post'}><Heart size={16}/><span>{p.likes}</span></button><button className="action-btn" onClick={()=>setActive('Messages')} aria-label="Comment on post"><MessageSquare size={16}/><span>{p.comments}</span></button><button className="action-btn" onClick={()=>toggleSave(p.id)} aria-label={p.saved?'Remove from saved posts':'Save post'}><BookmarkPlus size={16}/></button><button className="action-btn" aria-label="Share post"><Share2 size={16}/></button></div>{(comments[p.id]||[]).length>0&&<div className="comments-box">{(comments[p.id]||[]).map((comment,i)=><div className="comment" key={i}><b>Community reply</b><p>{comment}</p></div>)}</div>}<div className="comment-form"><input aria-label={'Write a comment for post '+p.id} value={commentDrafts[p.id]||''} onChange={e=>setCommentDrafts(d=>({...d,[p.id]:e.target.value}))} placeholder="Write a thoughtful comment..." /><button onClick={()=>sendComment(p.id)} aria-label="Send comment"><Send size={15}/></button></div></article>)}</section><aside className="right-rail"><div className="rail-card daily-card"><div className="rail-title"><span className="rail-icon sun">✦</span><div><b>A little reminder</b><small>YOUR DAILY PAUSE</small></div></div><p>Good work is built in small, repeatable moments. Pick one thing today that moves you forward.</p></div><div className="rail-card"><div className="rail-title"><div><b>Trending circles</b><small>COMMUNITY ENERGY</small></div></div>{circles.slice(0,3).map(c=><div className="mini-circle" key={c.name}><span className={'circle-badge '+c.color}>{c.icon}</span><div><strong>{c.name}</strong><small>{c.members}</small></div><button className="join-chip" onClick={()=>toggleCommunity(c.name)}>{joined.includes(c.name)?'Joined':'Join'}</button></div>)}</div></aside></div>}
      {active==='Discover'&&<div className="generic-page"><div className="discover-hero"><div><span className="welcome-kicker">YOUR NEXT GOOD CONNECTION</span><h2>People who just <em>get you.</em></h2><p>Explore nearby creators, builders, and thoughtful minds who match your interests.</p></div><div className="mini-spark"><Sparkles size={20}/> AI match</div></div><div className="discover-grid">{filteredPeople.map(person=><div className="person-card" key={person.handle}><div className="person-header"><Avatar text={person.avatar} color={person.color} size="lg"/><button className={'follow-btn '+(person.followed?'followed':'')} onClick={()=>setPeople(ps=>ps.map(p=>p.handle===person.handle?{...p,followed:!p.followed}:p))}>{person.followed?'Following':'Follow'}</button></div><h3>{person.name}</h3><p className="person-handle">@{person.handle}</p><p className="person-role">{person.role}</p><div className="interest-list">{person.interests.map(interest=><span key={interest}>{interest}</span>)}</div><div className="match-row"><span>Match</span><strong>{person.match}%</strong></div></div>)}</div></div>}
      {active==='Communities'&&<div className="generic-page"><div className="section-toolbar"><div><h3>Find your kind of people</h3><p>Small circles. Shared curiosity. Big things happen.</p></div><button className="secondary-btn"><Plus size={16}/> Create circle</button></div><div className="community-grid">{circles.map(circle=><div className="circle-card" key={circle.name}><div className='circle-header'><span className={'circle-badge '+circle.color}>{circle.icon}</span><button className={'join-btn '+(joined.includes(circle.name)?'joined':'')} onClick={()=>toggleCommunity(circle.name)>{joined.includes(circle.name)?'Joined':'Join circle'}</button></div><h3>{circle.name}</h3><p className="circle-tag">#{circle.tag}</p><p>{circle.description}</p><div className="circle-meta"><span>{circle.members}</span><span>members</span></div></div>)}</div></div>}
      {active==='Messages'&&<div className="messages-layout"><div className="inbox-panel"><div className="inbox-heading"><h3>Messages</h3><button className="icon-btn" aria-label="Start a new conversation" onClick={()=>notify('Start a conversation with someone you trust.')}><Plus size={17}/></button></div>{['Aarav','Meera','Ananya'].map(name=><button key={name} className="message-row" onClick={()=>setActive('Messages')}><Avatar text={name.slice(0,2).toUpperCase()} color={name==='Aarav'?'coral':name==='Meera'?'lavender':'mint'} size="sm"/><div><strong>{name}</strong><small>Would love to swap notes on your latest launch.</small></div><span>Now</span></button>)}</div><div className="chat-panel"><div className="chat-header"><h3>Creative chat</h3><button className="ghost-btn"><BadgeCheck size={16}/> Verified</button></div><div className="chat-messages">{chatMessages.map((message,index)=><div key={index} className={index%2===0?'chat-bubble incoming':'chat-bubble outgoing'}>{message}</div>)}</div><div className="chat-input-row"><input aria-label="Type your message" value={chat} onChange={e=>setChat(e.target.value)} placeholder="Write a thoughtful note..." /><button type="button" onClick={sendChat} aria-label="Send message"><Send size={15}/></button></div></div></div>}
      {active==='Notifications'&&<div className="generic-page"><div className="section-toolbar"><div><h3>Recent activity</h3><p>All the little things happening in your community.</p></div><button className="ghost-btn">Mark all as read</button></div><div className="notification-list"><div className="notification-item"><span className="notif-dot"/><div><strong>Meera liked your AI note</strong><p>She found your latest idea especially useful.</p></div><time>12m</time></div><div className="notification-item"><span className="notif-dot"/><div><strong>Ananya replied to your message</strong><p>“This sounds like a great idea for a side project.”</p></div><time>1h</time></div></div></div>}
      {active==='Saved'&&<div className="generic-page"><div className="section-toolbar"><div><h3>Your little collection</h3><p>Ideas worth coming back to.</p></div></div>{posts.filter(p=>p.saved).length?posts.filter(p=>p.saved).map(p=><div className="saved-item" key={p.id}><div><strong>{p.name}</strong><p>{p.text}</p></div><button className="ghost-btn" onClick={()=>toggleSave(p.id)}>Remove</button></div>):<p className="empty-state">Save a post that feels useful, inspiring, or just worth revisiting.</p>}</div>}
      {active==='Events'&&<div className="generic-page"><div className="section-toolbar"><div><h3>Good people, good plans</h3><p>Meet up, learn something new, and make it happen together.</p></div><button className="secondary-btn"><CalendarDays size={16}/> Add event</button></div><div className="event-grid"><div className="event-card"><span className="event-date">May 18</span><h4>Design coffee chat</h4><p>Meet up for ideas, feedback, and a fresh perspective.</p></div><div className="event-card"><span className="event-date">May 22</span><h4>AI maker meetup</h4><p>Share what you built, what broke, and what you learned.</p></div></div></div>}
      {active==='Profile'&&<div className="generic-page profile-page"><div className="profile-cover"><div className="cover-star">✳</div></div><div className="profile-main"><Avatar text="KS" color="indigo" size="lg"/><div><h3>Kandi Sai Kishore</h3><p>@saikishore</p></div></div><div className="profile-stats"><div><strong>248</strong><span>posts</span></div><div><strong>2.8k</strong><span>followers</span></div><div><strong>389</strong><span>following</span></div></div></div>}
      {active==='Settings'&&<div className="generic-page settings-page"><div className="settings-card"><div className="settings-heading"><ShieldCheck size={22}/><div><h3>Privacy & safety</h3><p>You’re in control of what you share.</p></div></div><div className="settings-list"><button className="settings-row"><span>Profile visibility</span><ArrowRight size={16}/></button><button className="settings-row"><span>Blocked accounts</span><ArrowRight size={16}/></button><button className="settings-row"><span>Notifications</span><ArrowRight size={16}/></button></div></div></div>}
     </div>
    </main>
    {showComposer&&<div className="modal-backdrop" onClick={()=>setShowComposer(false)}><div className="composer-modal" onClick={e=>e.stopPropagation()}><div className="modal-heading"><div><h3>Create a post</h3><p>Share what you’re thinking and building.</p></div><button className="icon-btn" aria-label="Close composer" onClick={()=>setShowComposer(false)}><X size={17}/></button></div><textarea aria-label="Write a new post" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="What’s on your mind?" /><div className="composer-actions"><button className="ghost-btn" onClick={()=>setShowComposer(false)}>Cancel</button><button className="primary-btn" onClick={createPost}>Share post</button></div></div></div>}
    {toast&&<div className="toast"><Check size={17}/>{toast}</div>}
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {nav.map(n=><button type="button" aria-label={n.label} className={active===n.label?'active':''} key={n.label} onClick={()=>{setActive(n.label);setMobileNav(false)}}>{n.label === 'Home' ? <Home size={18}/> : n.label === 'Discover' ? <Compass size={18}/> : n.label === 'Communities' ? <Users size={18}/> : n.label === 'Messages' ? <MessageCircle size={18}/> : <Bell size={18}/>}</button>)}
    </nav>
   </div>
  </>
 );
}
export default App;