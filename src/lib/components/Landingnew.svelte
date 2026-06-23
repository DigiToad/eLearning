<script>
  const stats = [
    { val: '500+', label: 'Learners Empowered' },
    { val: '20+',  label: 'Expert Courses' },
    { val: '15+',  label: 'Skills Dev Centres' },
    { val: '100%', label: 'Industry Aligned' },
  ];

  const heroFeatures = [
    { icon: '🖥️', label: 'Self-paced, anytime & anywhere' },
    { icon: '🧪', label: 'Hands-on lab access' },
    { icon: '👨‍🏫', label: 'Experienced instructors' },
    { icon: '🏭', label: 'Industry collaborated' },
  ];

  const features = [
    {
      title: 'Self-Paced Courses — Anytime, Anywhere',
      desc: 'Learn at your own rhythm with on-demand lessons accessible 24/7 across any device. No fixed schedules, no pressure — just progress at your pace.',
      icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    },
    {
      title: 'Hands-On Learning',
      desc: 'Real testbed access — not just theory. Experiment on actual 5G, IoT, and quantum research infrastructure to build practical, job-ready skills.',
      icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    },
    {
      title: 'Experienced Instructors',
      desc: 'Learn from researchers and industry practitioners actively working in 5G, AI, and emerging wireless technologies — not just educators.',
      icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    },
    {
      title: 'Industry Collaborated Program',
      desc: 'Curriculum co-designed with leading industry partners ensuring you learn exactly what employers and research institutions demand today.',
      icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    },
  ];

  const steps = [
    { num: '01', title: 'Pick a Track',     desc: 'Choose from beginner to expert-level specialisations in your domain.' },
    { num: '02', title: 'Learn & Practice', desc: 'Watch lessons and apply skills in live lab environments.' },
    { num: '03', title: 'Get Mentored',     desc: 'Join live sessions and Q&As with domain experts.' },
    { num: '04', title: 'Get Certified',    desc: 'Complete assessments and earn your industry credential.' },
  ];

  const testimonials = [
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
  ];
</script>

<div class="text-[#e2eaf5] font-sans antialiased">

  <!-- ══════════════════════════════════
       HERO
  ══════════════════════════════════ -->
  <section
    class="relative overflow-hidden px-6 md:px-12 pt-20 pb-16"
    style="background: linear-gradient(160deg, #050b14 0%, #0a1628 60%, #050b14 100%);"
  >
    <!-- Grid lines -->
    <div
      class="pointer-events-none absolute inset-0"
      style="background-image: linear-gradient(rgba(0,200,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,0.04) 1px, transparent 1px); background-size: 48px 48px;"
    ></div>

    <!-- Glow blobs -->
    <div
      class="pointer-events-none absolute -top-20 -left-16 w-[500px] h-[400px]"
      style="background: radial-gradient(ellipse, rgba(0,200,255,0.12) 0%, transparent 65%); filter: blur(50px);"
    ></div>
    <div
      class="pointer-events-none absolute top-10 right-0 w-[300px] h-[300px]"
      style="background: radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 65%); filter: blur(60px);"
    ></div>

    <!-- Two-column layout -->
    <div class="relative max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

      <!-- LEFT: Text content -->
      <div class="flex-1 max-w-2xl">

        <!-- Badge -->
        <span class="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#e2eaf5] border border-[rgba(0,200,255,0.4)] bg-[rgba(0,200,255,0.08)] rounded-full px-4 py-1.5 mb-6">
          <span class="w-1.5 h-1.5 rounded-full bg-[#00c8ff] animate-pulse"></span>
          SkillsBlock Powered
        </span>

        <!-- Headline -->
        <h1
          class="font-extrabold leading-[1.05] tracking-tight mb-5 text-[#e2eaf5]"
          style="font-size: clamp(36px, 5vw, 64px);"
        >
          Learn the Tech of<br />
          <span class="text-[#00c8ff]">Tomorrow, Today.</span>
        </h1>

        <!-- Sub-headline -->
        <p class="font-light text-base md:text-lg leading-relaxed max-w-xl mb-8 text-white/60">
          Industry-aligned courses in 5G, AI, Quantum Technologies, and more —
          built for researchers, engineers, and innovators.
        </p>

        <!-- Feature pills -->
        <div class="flex flex-wrap gap-2.5 mb-10">
          {#each heroFeatures as f}
            <span class="inline-flex items-center gap-2 text-[13px] text-[#8aafc8] font-light bg-[rgba(0,200,255,0.06)] border border-[rgba(0,200,255,0.12)] rounded-lg px-3.5 py-2">
              <span>{f.icon}</span>
              {f.label}
            </span>
          {/each}
        </div>

        <!-- CTA -->
        <a
          href="https://www.skillsblock.in/learn"
          target="_blank"
          rel="noopener noreferrer"
          class="group inline-flex items-center gap-3 bg-[#00c8ff] hover:bg-[#00b3e6] text-[#050b14] font-bold text-base px-8 py-4 rounded-xl no-underline transition-all duration-300 hover:-translate-y-0.5 shadow-[0_0_32px_rgba(0,200,255,0.25)] hover:shadow-[0_8px_40px_rgba(0,200,255,0.35)]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Start Learning on SkillsBlock
          <svg class="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>

      </div>

      <!-- RIGHT: Hero Illustration -->
      <div class="flex-1 w-full max-w-[520px] hidden  items-center justify-center">
        <div class="relative w-full">

          <!-- Outer glow ring -->
          <div
            class="absolute inset-0 rounded-3xl"
            style="background: radial-gradient(ellipse at 50% 40%, rgba(0,200,255,0.13) 0%, transparent 70%); filter: blur(24px);"
          ></div>

          <!-- Main card: laptop/dashboard mockup -->
          <div
            class="relative rounded-2xl overflow-hidden"
            style="background: #0a1628; border: 1px solid rgba(0,200,255,0.18);"
          >
            <!-- Browser chrome bar -->
            <div class="flex items-center gap-2 px-4 py-3" style="background: #0d1e35; border-bottom: 1px solid rgba(0,200,255,0.1);">
              <span class="w-2.5 h-2.5 rounded-full bg-red-500/60"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-yellow-400/60"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-green-400/60"></span>
              <div class="flex-1 mx-3 rounded-md px-3 py-1 text-[11px] text-[#4a6580]" style="background: rgba(0,200,255,0.05); border: 1px solid rgba(0,200,255,0.1);">
                skillsblock.in/learn
              </div>
            </div>

            <!-- Dashboard content -->
            <div class="p-5 space-y-4">

              <!-- Course progress header -->
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-[11px] text-[#4a6580] uppercase tracking-widest mb-0.5">Current Course</p>
                  <p class="text-sm font-semibold text-[#e2eaf5]">5G Private Networks &amp; Deployment</p>
                </div>
                <span class="text-xs font-bold text-[#050b14] bg-[#00c8ff] rounded-full px-3 py-1">72%</span>
              </div>

              <!-- Progress bar -->
              <div class="w-full h-1.5 rounded-full" style="background: rgba(0,200,255,0.1);">
                <div class="h-1.5 rounded-full w-[72%]" style="background: linear-gradient(90deg, #00c8ff, #7c3aed);"></div>
              </div>

              <!-- Module list -->
              <div class="space-y-2.5">
                {#each [
                  { label: 'Introduction to 5G Architecture', done: true },
                  { label: 'RAN & Core Network Fundamentals',  done: true },
                  { label: 'Private Network Lab Setup',         done: true },
                  { label: 'Spectrum Management & Slicing',     done: false, active: true },
                  { label: 'Security Protocols in 5G',          done: false },
                ] as m}
                  <div
                    class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px]"
                    style="background: {m.active ? 'rgba(0,200,255,0.08)' : 'transparent'}; border: 1px solid {m.active ? 'rgba(0,200,255,0.2)' : 'transparent'};"
                  >
                    <!-- Check icon -->
                    <span class="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style="background: {m.done ? '#00c8ff' : m.active ? 'rgba(0,200,255,0.15)' : 'rgba(255,255,255,0.05)'};">
                      {#if m.done}
                        <svg class="w-3 h-3 text-[#050b14]" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      {:else if m.active}
                        <span class="w-2 h-2 rounded-full bg-[#00c8ff]"></span>
                      {/if}
                    </span>
                    <span class="text-[#e2eaf5]" style="color: {m.done ? '#4a6580' : m.active ? '#e2eaf5' : '#4a6580'}; {m.done ? 'text-decoration: line-through;' : ''}">{m.label}</span>
                    {#if m.active}
                      <span class="ml-auto text-[10px] text-[#00c8ff] font-semibold uppercase tracking-wider">In Progress</span>
                    {/if}
                  </div>
                {/each}
              </div>

              <!-- Bottom stats strip -->
              <div class="grid grid-cols-3 gap-3 pt-2" style="border-top: 1px solid rgba(0,200,255,0.08);">
                {#each [
                  { val: '12', label: 'Lessons Done' },
                  { val: '4.8★', label: 'Your Rating' },
                  { val: '6h', label: 'Time Spent' },
                ] as s}
                  <div class="text-center">
                    <p class="text-base font-extrabold text-[#00c8ff]">{s.val}</p>
                    <p class="text-[10px] text-[#4a6580]">{s.label}</p>
                  </div>
                {/each}
              </div>

            </div>
          </div>

          <!-- Floating badge: Lab Active -->
          <div
            class="absolute -bottom-4 -left-6 flex items-center gap-2.5 rounded-xl px-4 py-2.5 shadow-xl"
            style="background: #0d1e35; border: 1px solid rgba(0,200,255,0.25);"
          >
            <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0"></span>
            <div>
              <p class="text-[11px] font-semibold text-[#e2eaf5]">Lab Environment</p>
              <p class="text-[10px] text-[#4a6580]">5G Testbed — Active</p>
            </div>
          </div>

          <!-- Floating badge: Certificate -->
          <div
            class="absolute -top-4 -right-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 shadow-xl"
            style="background: #0d1e35; border: 1px solid rgba(124,58,237,0.3);"
          >
            <svg class="w-4 h-4 text-[#a78bfa] shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div>
              <p class="text-[11px] font-semibold text-[#e2eaf5]">Certificate</p>
              <p class="text-[10px] text-[#a78bfa]">Industry Verified</p>
            </div>
          </div>

        </div>
      </div>
      <!-- END RIGHT -->
<div class="flex-1 w-full max-w-[520px] hidden lg:flex items-center justify-center">
    <img  src  = 'landing1.png' alt = "Landing page "/>
</div>
    </div>
  </section>

  <!-- ══════════════════════════════════
       STATS
  ══════════════════════════════════ -->
  <div class="max-w-7xl mx-auto px-6 md:px-12 pb-14 md:mt-6">
    <div
      class="grid grid-cols-2 md:grid-cols-4 rounded-2xl overflow-hidden"
      style="border: 1px solid rgba(0,200,255,0.12); background: #0d1e35;"
    >
      {#each stats as s, i}
        <div
          class="flex flex-col items-center justify-center py-10 px-4 text-center"
          style="{i < stats.length - 1 ? 'border-right: 1px solid rgba(0,200,255,0.1);' : ''}"
        >
          <span class="font-extrabold text-4xl tabular-nums mb-2 text-[#00c8ff]">{s.val}</span>
          <span class="text-xs font-medium text-[#8aa0b8]">{s.label}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- ══════════════════════════════════
       WHY SKILLSBLOCK — 4 FEATURES
  ══════════════════════════════════ -->
  <section class="max-w-7xl mx-auto px-6 md:px-12 pb-16">
    <h2 class="font-extrabold text-primary-500 text-2xl md:text-3xl mb-8 leading-tight">
      Everything You Need to Excel
    </h2>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {#each features as f}
        <div
          class="rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(0,200,255,0.25)]"
          style="background: #0d1e35; border: 1px solid rgba(0,200,255,0.1);"
        >
          <div class="w-12 h-12 rounded-xl flex items-center justify-center text-[#00c8ff] mb-5"
            style="background: rgba(0,200,255,0.12);">
            {@html f.icon}
          </div>
          <h3 class="font-bold text-[#e2eaf5] text-[15px] mb-3">{f.title}</h3>
          <p class="text-sm text-[#6b8098] font-light leading-relaxed">{f.desc}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- ══════════════════════════════════
       LEARNING PATH
  ══════════════════════════════════ -->
  <section class="max-w-7xl mx-auto px-6 md:px-12 pb-16">
    <div
      class="rounded-2xl p-8 md:p-10"
      style="background: #0d1e35; border: 1px solid rgba(0,200,255,0.1);"
    >
      <p class="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#00c8ff] mb-2">How It Works</p>
      <h2 class="font-extrabold text-[#e2eaf5] text-xl md:text-2xl mb-10 leading-tight">
        Your Learning Journey
      </h2>

      <div class="relative">
        <div
          class="hidden md:block absolute top-[22px] left-0 right-0 h-px"
          style="background: linear-gradient(90deg, transparent, rgba(0,200,255,0.3), transparent);"
        ></div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
          {#each steps as p}
            <div class="flex flex-col items-start md:items-center md:text-center gap-3">
              <span
                class="relative z-10 w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-sm text-[#050b14] shrink-0 bg-[#00c8ff]"
              >
                {p.num}
              </span>
              <div>
                <h4 class="font-bold text-[#e2eaf5] text-sm mb-1">{p.title}</h4>
                <p class="text-xs text-[#6b8098] font-light leading-relaxed">{p.desc}</p>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <!-- ══════════════════════════════════
       TESTIMONIALS
  ══════════════════════════════════ -->
  <section class="max-w-7xl mx-auto px-6 md:px-12 pb-16">
    <h2 class="font-extrabold text-primary-500 text-2xl md:text-3xl mb-8 leading-tight">
      Real Results, Real People
    </h2>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      {#each testimonials as t}
        <div
          class="rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1"
          style="background: #0d1e35; border: 1px solid rgba(0,200,255,0.1);"
        >
          <div class="flex gap-1">
            {#each Array(5) as _}
              <svg class="w-3.5 h-3.5 text-[#00c8ff]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            {/each}
          </div>

          <p class="text-sm text-[#c8d8e8] font-light leading-relaxed flex-1">"{t.quote}"</p>

          <div
            class="flex items-center gap-3 pt-3"
            style="border-top: 1px solid rgba(0,200,255,0.08);"
          >
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-[#050b14] bg-[#00c8ff] shrink-0">
              {t.name[0]}
            </div>
            <div>
              <p class="text-xs font-semibold text-[#e2eaf5]">{t.name}</p>
              <p class="text-[11px] text-[#6b8098]">{t.role}</p>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- ══════════════════════════════════
       BOTTOM CTA BANNER
  ══════════════════════════════════ -->
  <div class="max-w-7xl mx-auto px-6 md:px-12 pb-20">
    <div
      class="relative rounded-2xl overflow-hidden text-center py-16 px-6"
      style="background: #0d1e35; border: 1px solid rgba(0,200,255,0.15);"
    >
      <div
        class="pointer-events-none absolute inset-0"
        style="background: radial-gradient(ellipse at 50% 0%, rgba(0,200,255,0.09) 0%, transparent 65%);"
      ></div>

      <div class="relative z-10">
        <p class="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#00c8ff] mb-3">Get Started</p>
        <h2 class="font-extrabold text-[#e2eaf5] text-2xl md:text-4xl mb-4 leading-tight">
          Ready to Start Your Journey?
        </h2>
        <p class="text-[#8aa0b8] text-sm md:text-base font-light max-w-md mx-auto mb-10 leading-relaxed">
          Access all courses, hands-on labs, and expert-led sessions on the SkillsBlock platform.
        </p>
        <a
          href="https://www.skillsblock.in/learn"
          target="_blank"
          rel="noopener noreferrer"
          class="group inline-flex items-center gap-3 bg-[#00c8ff] hover:bg-[#00b3e6] text-[#050b14] font-bold text-base px-10 py-4 rounded-xl no-underline transition-all duration-300 hover:-translate-y-0.5 shadow-[0_0_32px_rgba(0,200,255,0.25)] hover:shadow-[0_8px_40px_rgba(0,200,255,0.35)]"
        >
          Go to SkillsBlock Learning
          <span
            class="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-transform duration-200 group-hover:translate-x-0.5"
            style="background: rgba(0,0,0,0.12);"
          >→</span>
        </a>
      </div>
    </div>
  </div>

</div>