<!-- src/routes/admin/dashboard/courses/[courseId]/+page.svelte -->
<script>
	import Icon from '@iconify/svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	export let data; // { course, isDraft, courseId }
	export let form; // form action results

	$: course = data.course;
	$: isDraft = data.isDraft;
	$: modules = course.modules ?? [];

	// ── UI state ───────────────────────────────────────────────────────────────
	let editingCourse = false;
	let deletingCourse = false;
	let openModule = -1;
	let editingModule = null;
	let deletingModule = null;
	let editingLesson = null;
	let deletingLesson = null; // { moduleId, lessonId }
	let replacingAsmnt = null;

	// ── Assessment client-side validation state ────────────────────────────────
	// keyed by moduleId
	let asmntFileError = {}; // { [moduleId]: string }
	let asmntFileName = {};  // { [moduleId]: string }
	let asmntParsed = {};    // { [moduleId]: object } — validated payload ready to submit

	// ── Toast ──────────────────────────────────────────────────────────────────
	let notify = null;
	$: if (form?.success) {
		notify = { type: 'success', msg: actionLabel(form.action) };
		if (form.action === 'editCourse')        editingCourse  = false;
		if (form.action === 'editModule')        editingModule  = null;
		if (form.action === 'editLesson')        editingLesson  = null;
		if (form.action === 'deleteLesson')      deletingLesson = null;
		if (form.action === 'deleteModule')      deletingModule = null;
		if (form.action === 'replaceAssessment') replacingAsmnt = null;
		setTimeout(() => (notify = null), 3500);
		invalidateAll();
	}
	$: if (form?.serverError || form?.error) {
		notify = { type: 'error', msg: form?.serverError ?? form?.error };
	}

	function actionLabel(a) {
		const map = {
			editCourse:        '✓ Course info updated.',
			editModule:        '✓ Module saved.',
			editLesson:        '✓ Lesson saved.',
			deleteLesson:      '✓ Lesson deleted.',
			deleteModule:      '✓ Module deleted.',
			toggleStatus:      '✓ Status changed.',
			replaceAssessment: '✓ Assessment replaced.'
		};
		return map[a] ?? '✓ Done!';
	}

	// ── Helpers ────────────────────────────────────────────────────────────────
	function fmtSecs(s) {
		const h   = Math.floor(s / 3600);
		const m   = Math.floor((s % 3600) / 60);
		const sec = s % 60;
		return h ? `${h}h ${m}m` : m ? `${m}m ${sec}s` : `${sec}s`;
	}

	function moduleStatus(mod) {
		const ok      = mod.lessons.length > 0 && mod.assessment != null;
		const partial = mod.lessons.length > 0 || mod.assessment != null;
		return ok ? 'complete' : partial ? 'partial' : 'empty';
	}

	const DOT = { complete: 'bg-emerald-500', partial: 'bg-amber-400', empty: 'bg-zinc-600' };

	function handleResult() {
		return async ({ result, update }) => {
			await update({ reset: false });
			await invalidateAll();
		};
	}

	// ── Assessment file picker & client-side validation ────────────────────────
	/**
	 * Validate the parsed JSON object coming from any source (JSON / extracted from PDF or DOCX).
	 * Returns an array of error strings; empty array = valid.
	 */
	function validateAssessmentPayload(parsed) {
		const errs = [];
		if (!parsed || typeof parsed !== 'object') { errs.push('File does not contain a valid assessment object.'); return errs; }
		if (!parsed.title)                         errs.push('Missing "title" field.');
		if (!Array.isArray(parsed.questions) || !parsed.questions.length)
			errs.push('"questions" array is required and must be non-empty.');
		(parsed.questions ?? []).forEach((q, qi) => {
			if (!q.text)                                           errs.push(`Q[${qi + 1}] missing "text".`);
			if (!['mcq', 'truefalse'].includes(q.type))           errs.push(`Q[${qi + 1}] invalid type (must be "mcq" or "truefalse").`);
			if (!Array.isArray(q.options) || q.options.length < 2) errs.push(`Q[${qi + 1}] needs at least 2 options.`);
			else if (!q.options.some((o) => o.isCorrect === true)) errs.push(`Q[${qi + 1}] needs exactly one correct option (isCorrect: true).`);
		});
		return errs;
	}

	/**
	 * Try to extract a JSON assessment object from a raw text string.
	 * Looks for the outermost {...} block — useful when a PDF/DOCX contains JSON embedded in text.
	 */
	function extractJsonFromText(text) {
		// First try direct parse
		try { return JSON.parse(text); } catch (_) { /* fall through */ }
		// Then look for first { ... } block
		const start = text.indexOf('{');
		const end   = text.lastIndexOf('}');
		if (start !== -1 && end !== -1 && end > start) {
			try { return JSON.parse(text.slice(start, end + 1)); } catch (_) { /* fall through */ }
		}
		return null;
	}

	/**
	 * Handle file selection for any module's assessment upload.
	 * Reads the file, attempts to parse/validate, then stores result keyed by moduleId.
	 */
	async function handleAssessmentFile(e, moduleId) {
		const file = e.target.files?.[0];
		asmntFileError = { ...asmntFileError, [moduleId]: '' };
		asmntFileName  = { ...asmntFileName,  [moduleId]: '' };
		asmntParsed    = { ...asmntParsed,    [moduleId]: null };

		if (!file) return;

		const ext = file.name.split('.').pop().toLowerCase();
		const allowed = ['json', 'pdf', 'doc', 'docx'];
		if (!allowed.includes(ext)) {
			asmntFileError = { ...asmntFileError, [moduleId]: `Unsupported file type ".${ext}". Accepted: .json, .pdf, .doc, .docx` };
			return;
		}

		asmntFileName = { ...asmntFileName, [moduleId]: file.name };

		// ── JSON: parse directly ──────────────────────────────────────────────
		if (ext === 'json') {
			const text = await file.text();
			const parsed = extractJsonFromText(text);
			if (!parsed) {
				asmntFileError = { ...asmntFileError, [moduleId]: 'Could not parse JSON. Please check the file is valid JSON.' };
				return;
			}
			const errs = validateAssessmentPayload(parsed);
			if (errs.length) {
				asmntFileError = { ...asmntFileError, [moduleId]: errs.join('\n') };
				return;
			}
			asmntParsed = { ...asmntParsed, [moduleId]: parsed };
			return;
		}

		// ── PDF / DOC / DOCX: read as text (best-effort extraction) ──────────
		// For PDF/DOCX these are binary; we do a best-effort text extraction
		// looking for embedded JSON. For production you'd use a server-side
		// extraction step, but we can validate the structure if JSON is embedded.
		if (ext === 'pdf' || ext === 'doc' || ext === 'docx') {
			// Attempt ArrayBuffer → text (works if doc contains readable UTF-8 JSON)
			const buffer = await file.arrayBuffer();
			const decoder = new TextDecoder('utf-8', { fatal: false });
			const rawText = decoder.decode(buffer);
			const parsed  = extractJsonFromText(rawText);

			if (!parsed) {
				// Can't extract JSON from binary — still valid upload, server will handle
				// but we can't client-validate structure. Warn the user.
				asmntFileError = {
					...asmntFileError,
					[moduleId]:
						`ℹ️ Could not extract JSON structure from this ${ext.toUpperCase()} for client-side validation. ` +
						`The file will be sent to the server. Make sure it contains a valid assessment JSON block.`
				};
				// Allow submit anyway — set parsed to a sentinel so the form sends
				asmntParsed = { ...asmntParsed, [moduleId]: '__raw__' };
				return;
			}

			const errs = validateAssessmentPayload(parsed);
			if (errs.length) {
				asmntFileError = { ...asmntFileError, [moduleId]: errs.join('\n') };
				return;
			}
			asmntParsed = { ...asmntParsed, [moduleId]: parsed };
		}
	}

	/**
	 * Intercept assessment form submit — if we have a cleanly parsed+validated payload,
	 * swap the file for a synthesised JSON blob so the server always receives clean JSON.
	 */
	function handleAssessmentSubmit(moduleId) {
		return async ({ formData, cancel }) => {
			const parsed = asmntParsed[moduleId];

			if (!parsed) {
				// No valid file selected yet
				asmntFileError = { ...asmntFileError, [moduleId]: 'Please select a valid assessment file first.' };
				cancel();
				return;
			}

			// If we successfully parsed the content, replace the file with clean JSON
			if (parsed !== '__raw__') {
				const jsonBlob = new Blob([JSON.stringify(parsed)], { type: 'application/json' });
				// Svelte FormData: replace existing file entry with the clean JSON blob
				formData.set('assessmentFile', jsonBlob, 'assessment.json');
			}
			// '__raw__' = binary file that yielded no parseable JSON; let server handle/reject
		};
	}
</script>

<svelte:head>
	<link
		href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Space+Mono:wght@400;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="min-h-screen bg-[#0d0f14] text-zinc-100 pb-24" style="font-family:'DM Sans',sans-serif">

	<!-- ── Top bar ─────────────────────────────────────────────────────────── -->
	<div class="sticky top-0 z-40 bg-[#0d0f14]/90 backdrop-blur border-b border-white/5 px-8 py-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<a href="/admin/dashboard/courses" class="text-zinc-500 hover:text-zinc-200 text-sm transition-colors">← Courses</a>
			<span class="text-zinc-700">/</span>
			<span class="text-sm text-zinc-300 truncate max-w-xs">{course.title}</span>
		</div>

		<div class="flex items-center gap-2">
			<span class="text-xs px-3 py-1 rounded-full {course.status === 'published' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-700/30' : 'bg-amber-500/15 text-amber-400 border border-amber-700/30'}">
				{course.status}
			</span>

			<form method="POST" action="?/toggleStatus" use:enhance={handleResult}>
				<input type="hidden" name="currentStatus" value={course.status} />
				<button type="submit" class="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:border-violet-500/40 hover:text-violet-300 transition-all">
					{course.status === 'published' ? 'Unpublish' : 'Publish'}
				</button>
			</form>

			<button
				on:click={() => (editingCourse = !editingCourse)}
				class="text-xs px-3 py-1.5 rounded-lg border transition-all {editingCourse ? 'bg-violet-600/20 border-violet-500/40 text-violet-300' : 'border-white/10 text-zinc-400 hover:border-violet-500/40 hover:text-violet-300'}"
			>✎ Edit Info</button>

			<button
				on:click={() => (deletingCourse = true)}
				class="text-xs px-3 py-1.5 rounded-lg border border-red-700/30 text-red-400 hover:bg-red-950/30 transition-all"
			>🗑 Delete</button>
		</div>
	</div>

	<!-- Toast -->
	{#if notify}
		<div class="fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl border {notify.type === 'success' ? 'bg-emerald-950 border-emerald-700/40 text-emerald-300' : 'bg-red-950 border-red-700/40 text-red-300'}">
			{notify.msg}
		</div>
	{/if}

	<div class="max-w-5xl mx-auto px-8 pt-8 space-y-8">

		<!-- ══════════════════════════════════════════════════════════════════════ -->
		<!-- COURSE HERO / INFO                                                    -->
		<!-- ══════════════════════════════════════════════════════════════════════ -->
		{#if !editingCourse}
			<div class="bg-[#13161d] border border-white/5 rounded-2xl overflow-hidden">
				<div class="relative h-52">
					<img src={course.image} alt={course.title} class="w-full h-full object-cover" />
					<div class="absolute inset-0 bg-gradient-to-t from-[#13161d] via-transparent to-transparent"></div>
				</div>
				<div class="px-7 pb-7 -mt-6 relative">
					<div class="flex items-start justify-between gap-4">
						<div>
							<h1 class="text-2xl font-bold">{course.title}</h1>
							<p class="text-zinc-400 text-sm mt-1">{course.description}</p>
						</div>
						<img src={course.instructorAvatar} alt={course.instructor} class="w-12 h-12 rounded-full border-2 border-white/10 flex-shrink-0 mt-2 bg-zinc-800" />
					</div>

					<div class="flex flex-wrap gap-2 mt-5">
						{#each [
							{ icon: 'mdi:account',               label: course.instructor },
							{ icon: 'mdi:tag',                   label: course.category },
							{ icon: 'mdi:signal',                label: course.level },
							{ icon: 'mdi:clock-outline',         label: course.duration ?? '—' },
							{ icon: 'mdi:play-circle-outline',   label: `${course.totalLessons ?? 0} lessons` },
							{ icon: 'mdi:star-outline',          label: `${course.rating ?? 0} / 5` },
							{ icon: 'mdi:account-group-outline', label: `${(course.students ?? 0).toLocaleString()} students` }
						] as pill}
							<span class="flex items-center gap-1.5 text-xs bg-zinc-800/80 text-zinc-400 border border-white/5 rounded-lg px-2.5 py-1">
								<Icon icon={pill.icon} width="14" />
								<span>{pill.label}</span>
							</span>
						{/each}
					</div>

					{#if (course.tags ?? []).length > 0}
						<div class="flex flex-wrap gap-1.5 mt-4">
							{#each course.tags as tag}
								<span class="text-xs bg-violet-950/50 text-violet-300 border border-violet-700/30 rounded-md px-2 py-0.5">{tag}</span>
							{/each}
						</div>
					{/if}
				</div>
			</div>

		{:else}
			<!-- Edit mode — NO duration field here; duration is auto-calculated from lessons -->
			<div class="bg-[#13161d] border border-violet-500/30 rounded-2xl p-7">
				<div class="flex items-center justify-between mb-6">
					<h2 class="font-semibold text-violet-300">Edit Course Info</h2>
					<button on:click={() => (editingCourse = false)} class="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">✕ Cancel</button>
				</div>

				<form method="POST" action="?/editCourse" use:enhance={handleResult} class="space-y-4">
					<div>
						<label class="lbl" for="ec-title">Course Name</label>
						<input id="ec-title" name="title" type="text" value={form?.values?.title ?? course.title}
							class="inp {form?.action === 'editCourse' && form?.errors?.title ? 'inp-err' : ''}" />
						{#if form?.action === 'editCourse' && form?.errors?.title}<p class="ferr">{form.errors.title}</p>{/if}
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="lbl" for="ec-cat">Category</label>
							<input id="ec-cat" name="category" type="text" value={form?.values?.category ?? course.category}
								class="inp {form?.action === 'editCourse' && form?.errors?.category ? 'inp-err' : ''}" />
							{#if form?.action === 'editCourse' && form?.errors?.category}<p class="ferr">{form.errors.category}</p>{/if}
						</div>
						<div>
							<label class="lbl" for="ec-level">Level</label>
							<select id="ec-level" name="level" class="inp">
								{#each ['Beginner', 'Intermediate', 'Advanced'] as lvl}
									<option value={lvl} selected={(form?.values?.level ?? course.level) === lvl}>{lvl}</option>
								{/each}
							</select>
						</div>
					</div>

					<div>
						<label class="lbl" for="ec-inst">Instructor</label>
						<input id="ec-inst" name="instructor" type="text" value={form?.values?.instructor ?? course.instructor}
							class="inp {form?.action === 'editCourse' && form?.errors?.instructor ? 'inp-err' : ''}" />
						{#if form?.action === 'editCourse' && form?.errors?.instructor}<p class="ferr">{form.errors.instructor}</p>{/if}
					</div>

					<div>
						<label class="lbl" for="ec-desc">Description</label>
						<textarea id="ec-desc" name="description" rows="3" class="inp resize-none">{form?.values?.description ?? course.description}</textarea>
					</div>

					<div>
						<label class="lbl" for="ec-img">Thumbnail URL</label>
						<input id="ec-img" name="image" type="url" value={form?.values?.image ?? course.image}
							class="inp {form?.action === 'editCourse' && form?.errors?.image ? 'inp-err' : ''}" />
						{#if form?.action === 'editCourse' && form?.errors?.image}<p class="ferr">{form.errors.image}</p>{/if}
					</div>

					<div>
						<label class="lbl" for="ec-tags">Tags <span class="normal-case font-normal text-zinc-600">(comma-separated)</span></label>
						<input id="ec-tags" name="tags" type="text" value={form?.values?.tags ?? (course.tags ?? []).join(', ')} class="inp" />
					</div>

					<div>
						<label class="lbl" for="ec-status">Status</label>
						<select id="ec-status" name="status" class="inp">
							<option value="draft"     selected={course.status === 'draft'}>Draft</option>
							<option value="published" selected={course.status === 'published'}>Published</option>
						</select>
					</div>

					{#if form?.action === 'editCourse' && form?.serverError}
						<p class="ferr">{form.serverError}</p>
					{/if}

					<div class="flex gap-3 pt-2">
						<button type="submit" class="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors">Save Changes</button>
						<button type="button" on:click={() => (editingCourse = false)} class="text-zinc-400 hover:text-zinc-200 px-5 py-2.5 rounded-xl hover:bg-white/5 transition-all text-sm">Cancel</button>
					</div>
				</form>
			</div>
		{/if}

		<!-- ══════════════════════════════════════════════════════════════════════ -->
		<!-- MODULES                                                               -->
		<!-- ══════════════════════════════════════════════════════════════════════ -->
		<div>
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-lg font-bold">
					Modules <span class="text-zinc-600 font-normal text-base">({modules.length})</span>
				</h2>
				<a href="/admin/dashboard/courses?courseId={data.courseId}"
					class="text-xs bg-violet-700 hover:bg-violet-600 text-white px-4 py-2 rounded-lg transition-colors">
					+ Add Module via Draft
				</a>
			</div>

			{#if modules.length === 0}
				<div class="border border-dashed border-white/10 rounded-2xl p-10 text-center text-zinc-600 text-sm">
					No modules yet. Use the draft wizard to add modules and lessons.
				</div>
			{:else}
				<div class="space-y-3">
					{#each modules as mod, mi (mod.id)}
						{@const status = moduleStatus(mod)}
						<div class="bg-[#13161d] border rounded-2xl overflow-hidden transition-all {openModule === mi ? 'border-violet-500/30' : 'border-white/5'}">

							<!-- Module accordion header -->
							<div class="px-5 py-4 flex items-center gap-3">
								<button type="button" on:click={() => (openModule = openModule === mi ? -1 : mi)} class="flex items-center gap-3 flex-1 min-w-0 text-left">
									<span class="w-2.5 h-2.5 rounded-full {DOT[status]} flex-shrink-0"></span>
									<span class="font-semibold text-sm truncate">{mod.title || `Module ${mi + 1}`}</span>
									<span class="text-xs text-zinc-600 flex-shrink-0">
										{mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}
										{#if mod.assessment}· ✓ quiz{/if}
									</span>
								</button>

								<div class="flex items-center gap-1.5 flex-shrink-0">
									<button
										on:click={() => (editingModule = editingModule === mod.id ? null : mod.id)}
										class="text-xs px-2.5 py-1.5 rounded-lg border transition-all {editingModule === mod.id ? 'bg-violet-600/20 border-violet-500/40 text-violet-300' : 'border-white/8 text-zinc-500 hover:text-zinc-300 hover:border-white/20'}"
									>✎</button>
									<button
										on:click={() => (deletingModule = mod.id)}
										class="text-xs px-2.5 py-1.5 rounded-lg border border-white/8 text-zinc-500 hover:text-red-400 hover:border-red-800/40 transition-all"
									>🗑</button>
									<button type="button" on:click={() => (openModule = openModule === mi ? -1 : mi)} class="text-zinc-500 text-sm w-6 text-center select-none">
										{openModule === mi ? '−' : '+'}
									</button>
								</div>
							</div>

							<!-- Edit module inline -->
							{#if editingModule === mod.id}
								<div class="px-5 pb-5 border-t border-white/5 pt-4 bg-violet-950/10">
									<form method="POST" action="?/editModule" use:enhance={handleResult}>
										<input type="hidden" name="moduleId" value={mod.id} />
										<div class="flex gap-3 items-end">
											<div class="flex-1">
												<label class="lbl" for="em-{mod.id}">Module Title</label>
												<input id="em-{mod.id}" name="moduleTitle" type="text" value={mod.title}
													class="inp {form?.action === 'editModule' && form?.moduleId === mod.id && form?.error ? 'inp-err' : ''}" />
												{#if form?.action === 'editModule' && form?.moduleId === mod.id && form?.error}
													<p class="ferr">{form.error}</p>{/if}
											</div>
											<div class="w-28">
												<label class="lbl" for="pm-{mod.id}">Pass Mark %</label>
												<input id="pm-{mod.id}" name="passMark" type="number" min="0" max="100" value={mod.passMark ?? 70} class="inp" />
											</div>
											<button type="submit" class="bg-violet-600 hover:bg-violet-500 text-white text-xs px-4 py-2.5 rounded-xl transition-colors flex-shrink-0">Save</button>
											<button type="button" on:click={() => (editingModule = null)} class="text-zinc-500 hover:text-zinc-300 text-xs px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all">Cancel</button>
										</div>
									</form>
								</div>
							{/if}

							<!-- Module body -->
							{#if openModule === mi}
								<div class="border-t border-white/5">

									<!-- Lessons list -->
									<div class="px-5 pt-5 pb-3">
										<p class="lbl mb-3">Lessons</p>

										{#if mod.lessons.length === 0}
											<p class="text-xs text-zinc-600 py-2">No lessons in this module yet.</p>
										{:else}
											<ul class="space-y-2">
												{#each mod.lessons as les, li (les.id)}
													<li>
														{#if editingLesson !== les.id}
															<div class="flex items-center gap-3 bg-zinc-900/50 rounded-xl px-4 py-3 group">
																<span class="text-xs text-zinc-600 w-5 flex-shrink-0" style="font-family:'Space Mono',monospace">{li + 1}</span>
																<div class="flex-1 min-w-0">
																	<p class="text-sm font-medium truncate">{les.title}</p>
																	<p class="text-xs text-zinc-600 mt-0.5 truncate">{fmtSecs(les.durationSeconds)} · {les.videoUrl}</p>
																</div>
																<div class="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
																	<button
																		on:click={() => (editingLesson = les.id)}
																		class="text-xs px-2 py-1 rounded-lg border border-white/8 text-zinc-500 hover:text-violet-300 hover:border-violet-700/40 transition-all"
																	>✎</button>
																	<button
																		on:click={() => (deletingLesson = { moduleId: mod.id, lessonId: les.id })}
																		class="text-xs px-2 py-1 rounded-lg border border-white/8 text-zinc-500 hover:text-red-400 hover:border-red-800/40 transition-all"
																	>🗑</button>
																</div>
															</div>
														{:else}
															<!-- Lesson edit inline -->
															<div class="bg-zinc-900/80 rounded-xl p-4 border border-violet-500/20">
																<form method="POST" action="?/editLesson" use:enhance={handleResult} class="space-y-3">
																	<input type="hidden" name="moduleId" value={mod.id} />
																	<input type="hidden" name="lessonId" value={les.id} />
																	<div>
																		<label class="lbl" for="lt-{les.id}">Lesson Title</label>
																		<input id="lt-{les.id}" name="lessonTitle" type="text" value={les.title}
																			class="inp {form?.action === 'editLesson' && form?.lessonId === les.id && form?.errors?.lessonTitle ? 'inp-err' : ''}" />
																		{#if form?.action === 'editLesson' && form?.lessonId === les.id && form?.errors?.lessonTitle}
																			<p class="ferr">{form.errors.lessonTitle}</p>{/if}
																	</div>
																	<div>
																		<label class="lbl" for="lv-{les.id}">Video URL</label>
																		<input id="lv-{les.id}" name="videoUrl" type="url" value={les.videoUrl}
																			class="inp {form?.action === 'editLesson' && form?.lessonId === les.id && form?.errors?.videoUrl ? 'inp-err' : ''}" />
																		{#if form?.action === 'editLesson' && form?.lessonId === les.id && form?.errors?.videoUrl}
																			<p class="ferr">{form.errors.videoUrl}</p>{/if}
																	</div>
																	<div>
																		<label class="lbl" for="ld-{les.id}">Duration (seconds)</label>
																		<input id="ld-{les.id}" name="durationSeconds" type="number" min="1" value={les.durationSeconds} class="inp w-36" />
																		{#if form?.action === 'editLesson' && form?.lessonId === les.id && form?.errors?.durationSeconds}
																			<p class="ferr">{form.errors.durationSeconds}</p>{/if}
																	</div>
																	{#if form?.action === 'editLesson' && form?.lessonId === les.id && form?.serverError}
																		<p class="ferr">{form.serverError}</p>{/if}
																	<div class="flex gap-2 pt-1">
																		<button type="submit" class="bg-violet-600 hover:bg-violet-500 text-white text-xs px-5 py-2 rounded-xl transition-colors">Save Lesson</button>
																		<button type="button" on:click={() => (editingLesson = null)} class="text-zinc-500 hover:text-zinc-300 text-xs px-4 py-2 rounded-xl hover:bg-white/5 transition-all">Cancel</button>
																	</div>
																</form>
															</div>
														{/if}
													</li>
												{/each}
											</ul>
										{/if}
									</div>

									<!-- ── Assessment section ────────────────────────────────────── -->
									<div class="px-5 py-5 border-t border-white/5">
										<div class="flex items-center justify-between mb-3">
											<p class="lbl">Assessment</p>
											<button
												on:click={() => (replacingAsmnt = replacingAsmnt === mod.id ? null : mod.id)}
												class="text-xs px-3 py-1.5 rounded-lg border transition-all {replacingAsmnt === mod.id ? 'bg-violet-600/20 border-violet-500/40 text-violet-300' : 'border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20'}"
											>{mod.assessment ? '↻ Replace' : '↑ Upload'}</button>
										</div>

										{#if mod.assessment}
											<div class="bg-emerald-950/30 border border-emerald-800/20 rounded-xl p-4 mb-3">
												<p class="text-emerald-400 text-sm font-semibold">✓ {mod.assessment.title}</p>
												<p class="text-xs text-zinc-500 mt-1">
													{mod.assessment.questions.length} question{mod.assessment.questions.length !== 1 ? 's' : ''}
													· Pass mark: {mod.assessment.passMark}%
													· Max attempts: {mod.assessment.attemptsAllowed}
												</p>
												<div class="mt-3 space-y-2">
													{#each mod.assessment.questions as q, qi}
														<div class="bg-zinc-900/50 rounded-lg px-3 py-2">
															<p class="text-xs text-zinc-300 font-medium">{qi + 1}. {q.text}</p>
															<div class="mt-1.5 space-y-1">
																{#each q.options as opt}
																	<div class="flex items-center gap-2">
																		<span class="w-3.5 h-3.5 rounded-full flex-shrink-0 border {opt.isCorrect ? 'bg-emerald-500 border-emerald-400' : 'border-zinc-600'}"></span>
																		<span class="text-xs {opt.isCorrect ? 'text-emerald-300' : 'text-zinc-500'}">{opt.text}</span>
																	</div>
																{/each}
															</div>
														</div>
													{/each}
												</div>
											</div>
										{:else}
											<p class="text-xs text-zinc-600 py-2">No assessment for this module yet.</p>
										{/if}

										<!-- Replace / Upload assessment form -->
										{#if replacingAsmnt === mod.id}
											<form
												method="POST"
												action="?/replaceAssessment"
												enctype="multipart/form-data"
												use:enhance={handleAssessmentSubmit(mod.id)}
												class="mt-3"
											>
												<input type="hidden" name="moduleId" value={mod.id} />

												<!-- File drop zone -->
												<label class="block cursor-pointer group">
													<input
														name="assessmentFile"
														type="file"
														accept=".json,.pdf,.doc,.docx"
														class="sr-only"
														on:change={(e) => handleAssessmentFile(e, mod.id)}
													/>
													<div class="border-2 border-dashed rounded-xl px-5 py-6 text-center transition-all
														{asmntFileError[mod.id] && !asmntFileError[mod.id].startsWith('ℹ️')
															? 'border-red-500/40 bg-red-950/20'
															: asmntParsed[mod.id]
																? 'border-emerald-500/40 bg-emerald-950/10'
																: 'border-white/10 group-hover:border-violet-500/40 group-hover:bg-violet-950/10'}"
													>
														<p class="text-xl mb-1">
															{#if asmntParsed[mod.id] && !asmntFileError[mod.id]}✅
															{:else if asmntFileError[mod.id] && !asmntFileError[mod.id].startsWith('ℹ️')}❌
															{:else}📄{/if}
														</p>
														{#if asmntFileName[mod.id]}
															<p class="text-xs text-zinc-300 font-medium">{asmntFileName[mod.id]}</p>
															<p class="text-xs text-zinc-600 mt-0.5">Click to change file</p>
														{:else}
															<p class="text-xs text-zinc-400">
																Click to select a
																<span class="text-violet-400">.json</span>,
																<span class="text-violet-400">.pdf</span>, or
																<span class="text-violet-400">.docx</span> assessment file
															</p>
														{/if}
													</div>
												</label>

												<!-- Validation feedback -->
												{#if asmntFileError[mod.id]}
													<div class="mt-2 rounded-xl px-3 py-2 text-xs whitespace-pre-wrap
														{asmntFileError[mod.id].startsWith('ℹ️')
															? 'bg-amber-950/40 border border-amber-700/30 text-amber-300'
															: 'bg-red-950/40 border border-red-700/30 text-red-300'}">
														{asmntFileError[mod.id]}
													</div>
												{/if}
												{#if asmntParsed[mod.id] && !asmntFileError[mod.id]}
													<div class="mt-2 rounded-xl px-3 py-2 text-xs bg-emerald-950/40 border border-emerald-700/30 text-emerald-300">
														✓ File looks valid — ready to upload
													</div>
												{/if}

												<!-- Server-side error -->
												{#if form?.action === 'replaceAssessment' && form?.moduleId === mod.id && form?.error}
													<p class="ferr mt-2 whitespace-pre-wrap">{form.error}</p>
												{/if}

												<div class="flex gap-2 mt-3">
													<button
														type="submit"
														class="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs px-5 py-2 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
														disabled={!asmntParsed[mod.id] && !asmntFileName[mod.id]}
													>↑ Upload & Validate</button>
													<button type="button" on:click={() => (replacingAsmnt = null)} class="text-zinc-500 hover:text-zinc-300 text-xs px-4 py-2 rounded-xl hover:bg-white/5 transition-all">Cancel</button>
												</div>
											</form>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- ══════════════════════════════════════════════════════════════════════════ -->
<!-- CONFIRM DELETE LESSON MODAL                                               -->
<!-- ══════════════════════════════════════════════════════════════════════════ -->
{#if deletingLesson}
	<!--
		FIX: do NOT reset `deletingLesson` on the submit button click — that would
		clear the hidden input values before the form data is captured.
		State is cleared reactively when form.action === 'deleteLesson' && form.success.
	-->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" on:click|self={() => (deletingLesson = null)}>
		<div class="bg-[#13161d] border border-red-800/40 rounded-2xl p-7 w-96 shadow-2xl">
			<p class="text-lg font-bold mb-2">Delete Lesson?</p>
			<p class="text-sm text-zinc-400 mb-6">This will permanently remove the lesson and cannot be undone.</p>
			<div class="flex gap-3">
				<form method="POST" action="?/deleteLesson" use:enhance={handleResult}>
					<input type="hidden" name="moduleId" value={deletingLesson.moduleId} />
					<input type="hidden" name="lessonId" value={deletingLesson.lessonId} />
					<!-- ✅ No on:click that resets state — let form success handle cleanup -->
					<button type="submit" class="bg-red-700 hover:bg-red-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors">
						Yes, Delete
					</button>
				</form>
				<button on:click={() => (deletingLesson = null)} class="text-zinc-400 hover:text-zinc-200 px-5 py-2.5 rounded-xl hover:bg-white/5 transition-all text-sm">Cancel</button>
			</div>
		</div>
	</div>
{/if}

<!-- ══════════════════════════════════════════════════════════════════════════ -->
<!-- CONFIRM DELETE MODULE MODAL                                               -->
<!-- ══════════════════════════════════════════════════════════════════════════ -->
{#if deletingModule}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" on:click|self={() => (deletingModule = null)}>
		<div class="bg-[#13161d] border border-red-800/40 rounded-2xl p-7 w-96 shadow-2xl">
			<p class="text-lg font-bold mb-2">Delete Module?</p>
			<p class="text-sm text-zinc-400 mb-6">All lessons and the assessment inside this module will be permanently deleted.</p>
			<div class="flex gap-3">
				<form method="POST" action="?/deleteModule" use:enhance={handleResult}>
					<input type="hidden" name="moduleId" value={deletingModule} />
					<!-- ✅ No on:click that resets state -->
					<button type="submit" class="bg-red-700 hover:bg-red-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors">
						Yes, Delete Module
					</button>
				</form>
				<button on:click={() => (deletingModule = null)} class="text-zinc-400 hover:text-zinc-200 px-5 py-2.5 rounded-xl hover:bg-white/5 transition-all text-sm">Cancel</button>
			</div>
		</div>
	</div>
{/if}

<!-- ══════════════════════════════════════════════════════════════════════════ -->
<!-- CONFIRM DELETE COURSE MODAL                                               -->
<!-- ══════════════════════════════════════════════════════════════════════════ -->
{#if deletingCourse}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" on:click|self={() => (deletingCourse = false)}>
		<div class="bg-[#13161d] border border-red-800/40 rounded-2xl p-7 w-[440px] shadow-2xl">
			<p class="text-xl font-bold mb-1 text-red-300">Delete "{course.title}"?</p>
			<p class="text-sm text-zinc-400 mb-2">
				This will permanently delete the course, all its modules, lessons, assessments, and any in-progress draft.
				This action <strong class="text-zinc-200">cannot be undone</strong>.
			</p>
			<div class="flex gap-3 mt-6">
				<form method="POST" action="?/deleteCourse" use:enhance>
					<button type="submit" class="bg-red-700 hover:bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
						🗑 Delete Forever
					</button>
				</form>
				<button on:click={() => (deletingCourse = false)} class="text-zinc-400 hover:text-zinc-200 px-5 py-2.5 rounded-xl hover:bg-white/5 transition-all text-sm">Cancel</button>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(.inp) {
		display: block; width: 100%;
		background: rgb(24 24 27);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 0.75rem;
		padding: 0.625rem 1rem;
		font-size: 0.875rem; color: #f4f4f5; outline: none;
		transition: border-color .15s, box-shadow .15s;
		font-family: inherit;
	}
	:global(.inp::placeholder) { color: #52525b; }
	:global(.inp:focus) {
		border-color: rgba(139,92,246,.55);
		box-shadow: 0 0 0 3px rgba(139,92,246,.12);
	}
	:global(.inp-err)       { border-color: rgba(239,68,68,.45) !important; }
	:global(.inp-err:focus) { box-shadow: 0 0 0 3px rgba(239,68,68,.12) !important; }
	:global(.lbl) {
		display: block; font-size: .7rem; font-weight: 600;
		letter-spacing: .07em; text-transform: uppercase;
		color: #a1a1aa; margin-bottom: .375rem;
	}
	:global(.ferr) { color: #f87171; font-size: .75rem; margin-top: .25rem; }
</style> 