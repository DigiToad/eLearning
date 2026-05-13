<!-- HERO -->
<div>
<div class="relative px-6 md:px-12 pt-16 pb-12 overflow-hidden"
  style="background: linear-gradient(160deg, #050b14 0%, #0a1628 60%, #050b14 100%);">

  <!-- Grid lines -->
  <div class="pointer-events-none absolute inset-0"
    style="background-image: linear-gradient(rgba(0,200,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,0.04) 1px, transparent 1px); background-size: 48px 48px;">
  </div>

  <!-- Glow orb -->
  <div class="pointer-events-none absolute -top-20 -left-20 w-[500px] h-[400px]"
    style="background: radial-gradient(ellipse, rgba(0,200,255,0.1) 0%, transparent 65%); filter: blur(50px);">
  </div>
  <div class="pointer-events-none absolute top-10 right-0 w-[300px] h-[300px]"
    style="background: radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 65%); filter: blur(60px);">
  </div>
<div class="max-w-7xl mx-auto">
  <div class="relative max-w-3xl">
    <span class="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] rounded-full text-white mb-5 p-2 border border-gray-500 bg-primary-400"
      >
      <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
      SkillsBlock Powered
    </span>

    <h1 class="font-extrabold leading-[1.05] tracking-tight mb-5"
      style="font-size: clamp(40px, 5.5vw, 72px); color: #e2eaf5;">
      Learn the Tech of<br />
      <span class="bg-clip-text text-primary-500 "
     >
        Tomorrow, Today.
      </span>
    </h1>

    <p class="font-light text-base md:text-lg leading-relaxed max-w-xl mb-10"
      style="color: #5f7d97;">
      Industry-aligned courses in 5G, AI, Quantum Technologies, and more —
      built for researchers, engineers, and innovators.
    </p>

    <!-- CTA BUTTON -->
    <a
      href="https://www.skillsblock.in/learn"
      target="_blank"
      rel="noopener noreferrer"
      class="group inline-flex items-center bg-primary-400 hover:bg-primary-500 shadow-lg gap-3 font-bold text-black text-base px-8 py-4 rounded-xl no-underline transition-all duration-300 hover:-translate-y-0.5"

    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Start Learning on SkillsBlock
      <svg class="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
        fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </a>
  </div>
  
  </div>
</div>
<div class="max-w-7xl mx-auto">
<!-- STATS -->
<div class="mt-10 px-6 md:px-12 pb-12">
  <div class="grid grid-cols-2 md:grid-cols-4 rounded-2xl overflow-hidden"
    style="border: 1px solid rgba(0,200,255,0.12); background: #0d1e35;">
    {#each [
      { val: '500+', label: 'Learners Empowered' },
      { val: '20+',  label: 'Expert Courses' },
      { val: '15+',  label: 'Skills Dev Centres' },
      { val: '100%', label: 'Industry Aligned' },
    ] as s, i}
      <div class="flex flex-col items-center justify-center py-10 px-4 text-center"
        style="{i !== 3 ? 'border-right: 1px solid rgba(0,200,255,0.1);' : ''}">
        <span class="font-extrabold text-4xl tabular-nums mb-2 text-primary-500">{s.val}</span>
        <span class="text-xs font-medium text-gray-300" >{s.label}</span>
      </div>
    {/each}
  </div>
</div>


<!-- WHY SKILLSBLOCK -->
<div class="px-6 md:px-12 pb-16">
  <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
    {#each [
      {
        icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        title: 'Hands-On Labs',
        desc: 'Real testbed access — not just theory. Experiment on actual 5G, IoT, and quantum research infrastructure.',
      },
      {
        icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        title: 'Expert Mentorship',
        desc: 'Learn from researchers and industry practitioners actively working in 5G, AI, and emerging wireless tech.',
      },
      {
        icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        title: 'Industry Certificates',
        desc: 'Earn credentials recognised by research institutions and industry partners across India and beyond.',
      },
    ] as f}
      <div class="rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
        style="background: #0d1e35; border: 1px solid rgba(0,200,255,0.1);">
        <div class="w-11 h-11 rounded-xl flex items-center justify-center text-cyan-400 mb-4 bg-primary-500 text-white"
          >
          {@html f.icon}
        </div>
        <h3 class="font-bold text-white text-base mb-2">{f.title}</h3>
        <p class="text-sm text-[#6b8098] font-light leading-relaxed">{f.desc}</p>
      </div>
    {/each}
  </div>
</div>

<!-- LEARNING PATH -->
<div class="px-6 md:px-12 pb-16">
  <div class="rounded-2xl p-8 md:p-10" style="background: #0d1e35; border: 1px solid rgba(0,200,255,0.1);">
    <p class="text-[16px] font-semibold uppercase tracking-[0.14em] text-primary-500 mb-2">How It Works</p>
    <h2 class="font-extrabold text-white text-xl md:text-2xl mb-8" style="line-height:1.2;">
      Your Learning Journey
    </h2>
    <div class="relative">
      <!-- connecting line -->
      <div class="hidden md:block absolute top-6 left-0 right-0 h-px" style="background: linear-gradient(90deg, transparent, rgba(0,200,255,0.3), transparent);"></div>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
        {#each [
          { step: '01', title: 'Pick a Track', desc: 'Choose from beginner to expert-level specialisations.' },
          { step: '02', title: 'Learn & Practice', desc: 'Watch lessons and apply skills in live lab environments.' },
          { step: '03', title: 'Get Mentored', desc: 'Join live sessions and Q&As with domain experts.' },
          { step: '04', title: 'Get Certified', desc: 'Complete assessments and earn your credential.' },
        ] as p}
          <div class="flex flex-col items-start md:items-center md:text-center gap-3">
            <span class="relative z-10 w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-sm text-black shrink-0 bg-primary-500"
              >
              {p.step}
            </span>
            <div>
              <h4 class="font-bold text-white text-sm mb-1">{p.title}</h4>
              <p class="text-xs text-[#6b8098] font-light leading-relaxed">{p.desc}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<!-- TESTIMONIALS -->
<div class="px-6 md:px-12 pb-16">
  <p class="text-xl font-semibold uppercase tracking-[0.14em] text-primary-500 mb-6">What Learners Say</p>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
    {#each [
      {
        quote: 'The 5G private network course gave me hands-on experience I could directly apply at work. Nothing else comes close.',
        name: 'Arjun Mehta',
        role: 'RF Engineer, Bengaluru',
      },
      {
        quote: 'As a faculty member, the quantum technologies track helped me redesign my entire curriculum. The lab access is incredible.',
        name: 'Dr. Priya Nair',
        role: 'Assistant Professor, NIT Calicut',
      },
      {
        quote: 'Got certified in AI for Telecom in 6 weeks. The mentors are actual practitioners — not just educators.',
        name: 'Rahul Shetty',
        role: 'Research Scholar, IISc',
      },
    ] as t}
      <div class="rounded-2xl p-6 flex flex-col gap-4" style="background: #0d1e35; border: 1px solid rgba(0,200,255,0.1);">
        <!-- Stars -->
        <div class="flex gap-1">
          {#each Array(5) as _}
            <svg class="w-3.5 h-3.5 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          {/each}
        </div>
        <p class="text-sm text-[#c8d8e8] font-light leading-relaxed flex-1">"{t.quote}"</p>
        <div class="flex items-center gap-3 pt-2" style="border-top: 1px solid rgba(0,200,255,0.08);">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black bg-primary-400"
            >
            {t.name[0]}
          </div>
          <div>
            <p class="text-xs font-semibold text-white">{t.name}</p>
            <p class="text-[11px] text-[#6b8098]">{t.role}</p>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- BOTTOM CTA BANNER -->
<div class="px-6 md:px-12 pb-16">
  <div class="relative rounded-2xl overflow-hidden text-center py-14 px-6"
    style="background: #0d1e35; border: 1px solid rgba(0,200,255,0.15);">
    <div class="pointer-events-none absolute inset-0"
      style="background: radial-gradient(ellipse at 50% 0%, rgba(0,200,255,0.09) 0%, transparent 65%);">
    </div>
    <div class="relative z-10">
      <p class="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary-400 mb-3">Get Started</p>
      <h2 class="font-extrabold text-white text-2xl md:text-4xl mb-4" style="line-height:1.15;">
        Ready to Start Your Journey?
      </h2>
      <p class="text-[#8aa0b8] text-sm md:text-base font-light max-w-md mx-auto mb-8 leading-relaxed">
        Access all courses, hands-on labs, and expert-led sessions on the SkillsBlock platform.
      </p>
      <a
        href="https://www.skillsblock.in/learn"
        target="_blank"
        rel="noopener noreferrer"
        class="group inline-flex items-center gap-3 font-bold text-black text-base px-10 py-4 rounded-xl no-underline transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl bg-primary-400 shadow-lg"

      >
        Go to SkillsBlock Learning
        <span class="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-transform duration-200 group-hover:translate-x-0.5"
          style="background: rgba(0,0,0,0.15);">
          →
        </span>
      </a>
    </div>
  </div>
</div>
</div>
</div>