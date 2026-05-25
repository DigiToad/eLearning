<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { toast } from 'svelte-sonner';
    import Icon from '@iconify/svelte';

    export let type  = 'image';
    export let value = '';
    export let ready = false;   // ← true only when safe to submit

    const dispatch = createEventDispatcher();

    let inputType  = 'file';
    let file       = null;
    let previewUrl = '';
    let filename   = '';
    let selected   = false;
    let uploaded   = false;
    let error      = '';
    let urlValue   = '';
    let initialised = false;

    $: isImage = type === 'image';
    $: label   = isImage ? 'Image' : 'Video';

    // ── Init from saved value (edit mode) ────────────────────────────────────
    onMount(() => {
        if (value) {
            filename  = value;
            urlValue  = value;
            inputType = 'url';
            selected  = true;
            uploaded  = true;
            ready     = true;
        }
        initialised = true;
    });

    $: if (initialised) value = filename;

    // ────────────────────────────────────────────────────────────────────────
    async function compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    let width = img.width, height = img.height;
                    if (width  > maxWidth)  { height = (height * maxWidth)  / width;  width  = maxWidth; }
                    if (height > maxHeight) { width  = (width  * maxHeight) / height; height = maxHeight; }
                    const canvas = document.createElement('canvas');
                    canvas.width = width; canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) { reject(new Error('Canvas to Blob failed')); return; }
                            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                        },
                        'image/jpeg', quality
                    );
                };
                img.onerror  = () => reject(new Error('Failed to load image'));
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
        });
    }

    async function handleFileChange(event) {
        const selectedFile = event.target.files[0];
        if (!selectedFile) return;
        error = ''; uploaded = false; selected = false; ready = false;

        if (isImage) {
            if (!selectedFile.type.startsWith('image/')) {
                error = 'Please select a valid image file'; toast.error(error); return;
            }
            try {
                let processed = selectedFile;
                if (selectedFile.size > 2 * 1024 * 1024) {
                    toast.warning('Large image detected. Compressing...');
                    processed = await compressImage(selectedFile, 1920, 1080, 0.85);
                    if (processed.size > 1 * 1024 * 1024) {
                        toast.warning('Trying higher compression...');
                        processed = await compressImage(selectedFile, 1600, 900, 0.7);
                    }
                    if (processed.size > 1 * 1024 * 1024) {
                        error = 'Image too large even after compression.'; toast.error(error); return;
                    }
                }
                file       = processed;
                filename   = sanitiseName(file.name);
                previewUrl = URL.createObjectURL(file);
                selected   = true;
                ready      = false;   // must Process first
                toast.success(`Image ready (${(file.size / 1024).toFixed(2)} KB) — click Process`);
            } catch {
                error = 'Failed to process image.'; toast.error(error);
            }
        } else {
            if (!selectedFile.type.startsWith('video/')) {
                error = 'Please select a valid video file'; toast.error(error); return;
            }
            if (selectedFile.size > 200 * 1024 * 1024) {
                error = 'Video must be less than 200 MB'; toast.error(error); return;
            }
            file       = selectedFile;
            filename   = sanitiseName(file.name);
            previewUrl = URL.createObjectURL(file);
            selected   = true;
            ready      = false;   // must Process first
            toast.success(`Video selected (${(file.size / (1024 * 1024)).toFixed(2)} MB) — click Process`);
        }
    }

    function sanitiseName(name) {
        return name.trim()
            .replace(/\s?\(\d+\)\./, '.')
            .replace(/[\\\/:*?"<>|()]/g, '-')
            .replace(/[^a-zA-Z0-9.-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    }

    async function uploadFile() {
        if (!file) { toast.warning(`Please select a ${label.toLowerCase()} first.`); return; }
        const formData = new FormData();
        formData.append(isImage ? 'image' : 'video', file);
        formData.append('filename', file.name);
        try {
            const response = await fetch('/api', { method: 'POST', body: formData });
            const result   = await response.json();
            if (response.ok) {
                uploaded = true;
                error    = '';
                filename = result.url;
                ready    = true;    // ← now safe to submit
                toast.success(`${label} processed successfully!`);
                dispatch('change', { mode: 'file', value: result.url, file });
            } else {
                toast.error(result.error || `${label} upload failed.`);
                uploaded = false;
                ready    = false;
            }
        } catch {
            toast.error(`An error occurred while uploading the ${label.toLowerCase()}.`);
            uploaded = false;
            ready    = false;
        }
    }

    function removeFile() {
        file = null; previewUrl = ''; filename = '';
        selected = false; uploaded = false; error = '';
        urlValue = ''; ready = false;
        const input = document.getElementById(`upload-${type}`);
        if (input) input.value = '';
        toast.success(`${label} removed`);
        dispatch('change', { mode: 'file', value: '' });
    }

    function handleUrlInput() {
        error = '';
        if (urlValue.trim()) {
            filename = urlValue.trim();
            uploaded = true;
            selected = true;
            ready    = true;    // URL needs no processing
            dispatch('change', { mode: 'url', value: urlValue.trim() });
        } else {
            filename = ''; uploaded = false; selected = false; ready = false;
            dispatch('change', { mode: 'url', value: '' });
        }
    }

    function switchInputType(t) {
        inputType = t; file = null; previewUrl = ''; filename = '';
        selected = false; uploaded = false; error = ''; urlValue = ''; ready = false;
        const input = document.getElementById(`upload-${type}`);
        if (input) input.value = '';
        dispatch('change', { mode: t, value: '' });
    }
</script>

<div class="space-y-3">
    <div class="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm">
        <button type="button" on:click={() => switchInputType('file')}
            class="px-3 py-1.5 transition-colors duration-200
                   {inputType === 'file' ? 'bg-gray-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}">
            <Icon icon="mdi:file-upload-outline" class="inline w-4 h-4 mr-1" />File Upload
        </button>
        <button type="button" on:click={() => switchInputType('url')}
            class="px-3 py-1.5 transition-colors duration-200
                   {inputType === 'url' ? 'bg-gray-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}">
            <Icon icon="mdi:link-variant" class="inline w-4 h-4 mr-1" />URL
        </button>
    </div>

    {#if inputType === 'file'}
        <input type="file" id="upload-{type}"
            accept={isImage ? 'image/*' : 'video/*'}
            on:change={handleFileChange} />

        {#if previewUrl}
            {#if isImage}
                <img src={previewUrl} alt="Preview"
                    class="h-32 w-32 object-cover mt-2 rounded border"
                    on:error={(e) => (e.target.src = '/skillsblock.png')} />
            {:else}
                <!-- svelte-ignore a11y-media-has-caption -->
                <video src={previewUrl} controls class="mt-2 rounded max-h-48 w-auto"></video>
            {/if}
        {/if}

        <div class="flex items-center gap-2 mt-2 flex-wrap">
            <button type="button" on:click={uploadFile}
                disabled={!selected || uploaded}
                class="px-5 py-1.5 bg-gray-700 border border-gray-700 text-white rounded
                       hover:bg-white hover:text-gray-700 transition-all duration-300
                       disabled:opacity-50 disabled:cursor-not-allowed">
                Process {label}
            </button>
            {#if selected || uploaded}
                <button type="button" on:click={removeFile}
                    class="px-5 py-1.5 bg-red-600 border border-red-600 text-white rounded
                           hover:bg-white hover:text-red-600 transition-all duration-300">
                    Remove {label}
                </button>
            {/if}
            {#if uploaded}
                <span class="text-green-500 text-sm flex items-center">
                    <Icon icon="mdi:check-circle" class="w-4 h-4 mr-1" />{label} processed successfully
                </span>
            {:else if selected}
                <!-- Nudge the user -->
                <span class="text-amber-400 text-sm flex items-center gap-1">
                    <Icon icon="mdi:alert-circle-outline" class="w-4 h-4" />
                    Click "Process {label}" to continue
                </span>
            {/if}
        </div>
        {#if error}<p class="text-red-500 text-xs mt-1">{error}</p>{/if}

    {:else}
        <input type="url" bind:value={urlValue}
            placeholder={isImage
                ? 'https://example.com/image.jpg'
                : 'https://example.com/video.mp4 or YouTube / Vimeo URL'}
            class="w-full p-2 border rounded {error ? 'border-red-500' : ''}"
            on:input={handleUrlInput} />

        {#if urlValue.trim()}
            <span class="text-green-500 text-sm flex items-center mt-1">
                <Icon icon="mdi:check-circle" class="w-4 h-4 mr-1" />URL ready — no processing needed
            </span>
            {#if isImage}
                <img src={urlValue.trim()} alt="URL preview"
                    class="h-32 w-32 object-cover mt-2 rounded border"
                    on:error={(e) => (e.target.src = '/skillsblock.png')} />
            {/if}
        {/if}
        {#if error}<p class="text-red-500 text-xs mt-1">{error}</p>{/if}
    {/if}
</div>