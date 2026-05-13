<script>
	import { onMount, tick } from 'svelte';
	import { enhance, applyAction } from '$app/forms';
	import { Toaster, toast } from 'svelte-sonner';

	import Icon from '@iconify/svelte';
/**
 * Compress image file before upload
 * @param {File} file - The image file to compress
 * @param {number} maxWidth - Maximum width (default: 1920)
 * @param {number} maxHeight - Maximum height (default: 1080)
 * @param {number} quality - JPEG quality 0-1 (default: 0.8)
 * @returns {Promise<File>} Compressed image file
 */
	let file;
	let previewUrl = '';

	let filename;

	let imageUploaded = false;
	let imageSelected = false;
	let imageError = '';

	let createModalOpen = false;

	let producturl = '';

	function closeCreateModal() {
		createModalOpen = false;
	}
async function compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		
		reader.onload = (event) => {
			const img = new Image();
			img.src = event.target.result;
			
			img.onload = () => {
				// Calculate new dimensions while maintaining aspect ratio
				let width = img.width;
				let height = img.height;
				
				if (width > maxWidth) {
					height = (height * maxWidth) / width;
					width = maxWidth;
				}
				
				if (height > maxHeight) {
					width = (width * maxHeight) / height;
					height = maxHeight;
				}
				
				// Create canvas and draw resized image
				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext('2d');
				ctx.drawImage(img, 0, 0, width, height);
				
				// Convert canvas to blob
				canvas.toBlob(
					(blob) => {
						if (!blob) {
							reject(new Error('Canvas to Blob conversion failed'));
							return;
						}
						
						// Create new file from blob
						const compressedFile = new File([blob], file.name, {
							type: 'image/jpeg',
							lastModified: Date.now()
						});
						
						console.log('Original size:', (file.size / 1024).toFixed(2), 'KB');
						console.log('Compressed size:', (compressedFile.size / 1024).toFixed(2), 'KB');
						console.log('Compression ratio:', ((1 - compressedFile.size / file.size) * 100).toFixed(1) + '%');
						
						resolve(compressedFile);
					},
					'image/jpeg',
					quality
				);
			};
			
			img.onerror = () => {
				reject(new Error('Failed to load image'));
			};
		};
		
		reader.onerror = () => {
			reject(new Error('Failed to read file'));
		};
	});
}
	// function handleFileChange(event) {
	// 	file = event.target.files[0];
	// 	if (file) {
	// 		if (file.size > 2 * 1024 * 1024) {
	// 			toast.error('Image size must be less than 2MB');
	// 			imageError = 'Image size must be less than 2MB';
	// 			imageSelected = false;
	// 			return;
	// 		}

	// 		if (!file.type.startsWith('image/')) {
	// 			toast.error('Please select a valid image file');
	// 			imageError = 'Please select a valid image file';
	// 			imageSelected = false;
	// 			return;
	// 		}

	// 		filename = file.name.trim();
	// 		filename = filename
	// 			.replace(/\s?\(\d+\)\./, '.')
	// 			.replace(/[\\\/:*?"<>|()]/g, '-')
	// 			.replace(/[^a-zA-Z0-9.-]/g, '-')
	// 			.replace(/-+/g, '-')
	// 			.replace(/^-+/, '')
	// 			.replace(/-+$/, '');
	// 		previewUrl = URL.createObjectURL(file);
	// 		imageSelected = true;
	// 		imageUploaded = false;
	// 		imageError = '';
	// 	}
	// }

	async function handleFileChange(event) {
	const selectedFile = event.target.files[0];
	if (!selectedFile) return;
	
	// Check file type first
	if (!selectedFile.type.startsWith('image/')) {
		toast.error('Please select a valid image file');
		imageError = 'Please select a valid image file';
		imageSelected = false;
		return;
	}
	
	// Check original size
	if (selectedFile.size > 5 * 1024 * 1024) {
		toast.warning('Large image detected. Compressing...');
	}
	
	try {
		// Compress the image
		file = await compressImage(selectedFile, 1920, 1080, 0.85);
		
		// Check compressed size (should now be under limit)
		if (file.size > 2 * 1024 * 1024) {
			toast.warning('Image still large after compression. Trying higher compression...');
			file = await compressImage(selectedFile, 1600, 900, 0.7);
		}
		
		// Final check
		if (file.size > 2 * 1024 * 1024) {
			toast.error('Image is too large even after compression. Please use a smaller image.');
			imageError = 'Image is too large even after compression';
			imageSelected = false;
			return;
		}
		
		// Process filename
		filename = file.name.trim();
		filename = filename
			.replace(/\s?\(\d+\)\./, '.')
			.replace(/[\\\/:*?"<>|()]/g, '-')
			.replace(/[^a-zA-Z0-9.-]/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-+/, '')
			.replace(/-+$/, '');
		
		// Create preview
		previewUrl = URL.createObjectURL(file);
		imageSelected = true;
		imageUploaded = false;
		imageError = '';
		
		const sizeKB = (file.size / 1024).toFixed(2);
		toast.success(`Image compressed to ${sizeKB} KB`);
		
	} catch (error) {
		console.error('Compression error:', error);
		toast.error('Failed to compress image. Please try another file.');
		imageError = 'Failed to compress image';
		imageSelected = false;
	}
}

	async function uploadImage() {
		if (!file) {
			toast.warning('Please select a file first.');
			return;
		}

		const formData = new FormData();
		formData.append('image', file);
		formData.append('filename', file.name);

		try {
			const response = await fetch('/api', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (response.ok) {
				imageUploaded = true;
				imageError = '';
				filename = result.url;
				toast.success('Image uploaded successfully!');
			} else {
				toast.error(result.error || 'Upload failed.');
				imageUploaded = false;
			}
		} catch (error) {
			console.error('Upload error:', error);
			toast.error('An error occurred while uploading the image.');
			imageUploaded = false;
		}
	}

	function handleImageError(event) {
		event.target.src = '/skillsblock.png';
	}
	export let isEditing = false;
	export let blogToEdit = null;
	export let showForm = false;

	let title = '';
	let subtitle = '';
	let description = '';
	let overview = '';
	let content = '';
	let image = '';
	let category = '';
	let customCategories = [];
	let newCategory = '';
	let imageType = 'url';
	let uploadedImage = null;
	let fileInput;
	let editor;
	let editorContainer;
	let Quill;

	let features = [{ key: '', value: '' }];
	let applications = [''];
	function sanitizeInput(input) {
		if (typeof input !== 'string') return input;

		let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
		sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
		sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

		sanitized = sanitized.replace(/javascript:/gi, '');

		sanitized = sanitized.replace(/data:text\/html/gi, '');

		return sanitized.trim();
	}

	function validateForm() {
		const errors = [];

		if (!sanitizeInput(title)) {
			errors.push('Title is required');
		}

		if (!sanitizeInput(description)) {
			errors.push('Description is required');
		}

		if (!sanitizeInput(category)) {
			errors.push('Category is required');
		}

		if (!image) {
			errors.push('Image is required');
		}

		const validFeatures = features.filter((f) => sanitizeInput(f.key) && sanitizeInput(f.value));

		if (validFeatures.length === 0 && features.some((f) => f.key || f.value)) {
			errors.push('Please complete all feature fields or remove empty ones');
		}

		const validApplications = applications.filter((a) => sanitizeInput(a));

		if (validApplications.length === 0 && applications.some((a) => a.trim())) {
			errors.push('Please complete all application fields or remove empty ones');
		}

		return errors;
	}

	function parseFeaturesFromBackend(featuresString) {
		try {
			if (!featuresString) return [{ key: '', value: '' }];

			const parsed = JSON.parse(featuresString);
			const converted = parsed.map((obj) => {
				const entries = Object.entries(obj);
				if (entries.length > 0) {
					return {
						key: entries[0][0],
						value: entries[0][1]
					};
				}
				return { key: '', value: '' };
			});

			return converted.length > 0 ? converted : [{ key: '', value: '' }];
		} catch (e) {
			console.error('Error parsing features:', e);
			return [{ key: '', value: '' }];
		}
	}

	function parseApplicationsFromBackend(applicationsString) {
		try {
			if (!applicationsString) return [''];
			const parsed = JSON.parse(applicationsString);
			return parsed.length > 0 ? parsed : [''];
		} catch (e) {
			console.error('Error parsing applications:', e);
			return [''];
		}
	}

	onMount(async () => {
		const stored = localStorage.getItem('customCategories');
		if (stored) {
			customCategories = JSON.parse(stored);
		}

		const quillModule = await import('quill');
		await import('quill/dist/quill.snow.css');
		Quill = quillModule.default;
		await tick();

		if (editorContainer && !editor) {
			editor = new Quill(editorContainer, {
				theme: 'snow',
				placeholder: 'Write your product content...',
				modules: {
					toolbar: [
						[{ header: [1, 2, 3, false] }],
						['bold', 'italic', 'underline'],
						[{ list: 'ordered' }, { list: 'bullet' }],
						[{ color: [] }],
						['link', 'blockquote', 'code-block', 'image'],
						['clean']
					]
				}
			});

			editor.on('text-change', () => {
				content = editor.root.innerHTML;
			});
		}
	});

	$: if (showForm) {
		initializeForm();
	}
	function generateNewsLink(title) {
		if (!title) return '';
		return title
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.replace(/-$/, '');
	}
    	$: {
		if (title) {
			producturl = generateNewsLink(title);
		}
	}
	async function initializeForm() {
		await tick();

		if (isEditing && blogToEdit) {
			title = sanitizeInput(blogToEdit.title || '');
			subtitle = sanitizeInput(blogToEdit.subtitle || '');
			description = sanitizeInput(blogToEdit.description || '');
			overview = sanitizeInput(blogToEdit.overview || '');
			category = sanitizeInput(blogToEdit.category || '');
			image = blogToEdit.image || '';
            producturl = blogToEdit.producturl || '';
			content = blogToEdit.content || '';
			imageType = image?.startsWith('http') ? 'url' : 'upload';
			features = parseFeaturesFromBackend(blogToEdit.features);
			applications = parseApplicationsFromBackend(blogToEdit.applications);

			if (editor) {
				editor.root.innerHTML = blogToEdit.content || '';
			}
		} else {
			title = '';
			subtitle = '';
			description = '';
			overview = '';
			category = '';
			image = '';
			content = '';
			imageType = 'url';
            producturl = '';
			uploadedImage = null;
			features = [{ key: '', value: '' }];
			applications = [''];

			if (editor) {
				editor.root.innerHTML = '';
			}
		}
	}

	function resetForm() {
		blogToEdit = null;
		isEditing = false;
		showForm = true;
	}

	function addFeature() {
		features = [...features, { key: '', value: '' }];
	}

	function removeFeature(index) {
		if (features.length > 1) {
			features = features.filter((_, i) => i !== index);
		} else {
			features = [{ key: '', value: '' }];
		}
	}

	function addApplication() {
		applications = [...applications, ''];
	}

	function removeApplication(index) {
		if (applications.length > 1) {
			applications = applications.filter((_, i) => i !== index);
		} else {
			applications = [''];
		}
	}

	function addCustomCategory() {
		const sanitizedCategory = sanitizeInput(newCategory);

		if (!sanitizedCategory) {
			toast.error('Please enter a valid category name');
			return;
		}

		if (customCategories.includes(sanitizedCategory)) {
			toast.error('This category already exists');
			return;
		}

		if (sanitizedCategory.length > 50) {
			toast.error('Category name must be less than 50 characters');
			return;
		}

		customCategories = [...customCategories, sanitizedCategory];
		localStorage.setItem('customCategories', JSON.stringify(customCategories));
		category = sanitizedCategory;
		newCategory = '';
		toast.success('Category added successfully!');
	}

	function removeCustomCategory(cat) {
		customCategories = customCategories.filter((c) => c !== cat);
		localStorage.setItem('customCategories', JSON.stringify(customCategories));
		if (category === cat) category = '';
		toast.success('Category removed successfully!');
	}

	function handleSubmit(event) {
		title = sanitizeInput(title);
		subtitle = sanitizeInput(subtitle);
		description = sanitizeInput(description);
		overview = sanitizeInput(overview);
		category = sanitizeInput(category);
		newCategory = sanitizeInput(newCategory);
		features = features.map((f) => ({
			key: sanitizeInput(f.key),
			value: sanitizeInput(f.value)
		}));

		applications = applications.map((a) => sanitizeInput(a));
		const errors = validateForm();
		if (errors.length > 0) {
			event.preventDefault();
			errors.forEach((error) => toast.error(error));
			return false;
		}

		return true;
	}

	const defaultCategories = ['Wireless', 'Data AC2', 'Test & Measurement', 'Quantum'];
	$: allCategories = [...defaultCategories, ...customCategories];
</script>

<div
	class={showForm
		? 'fixed inset-0 z-40 bg-black bg-opacity-40 flex items-center justify-center p-4'
		: 'hidden'}
>
	<div
		class="bg-white p-6 rounded-lg shadow-lg w-full max-w-5xl h-[90vh] overflow-y-auto relative z-50"
	>
		<h2 class="text-2xl font-bold mb-6">
			{isEditing ? 'Edit Product' : 'Create New Product'}
		</h2>

		<form
			class="space-y-6"
			method="POST"
			action={isEditing ? '?/editblog' : '?/createblogs'}
			enctype="multipart/form-data"
			on:submit={handleSubmit}
			use:enhance={({ cancel }) => {
				return async ({ result }) => {
					if (result.type === 'success') {
						if (result.data?.success) {
							toast.success(result.data.message);
							resetForm();
							showForm = false;
						} else {
							toast.error(result.data?.error || result.data?.message);
						}
					} else if (result.type === 'failure') {
						toast.error(result.data?.error || 'Form submission failed');
					}
					await applyAction(result);
				};
			}}
		>
			{#if blogToEdit}
				<input name="id" type="hidden" bind:value={blogToEdit.id} />
			{/if}
<div class="flex flex-col">
						<input
							type="hidden"
							name="producturl"
							class="rounded border p-2"
							bind:value={producturl}
							required
						/>
					</div>
			<div>
				<!-- svelte-ignore a11y-label-has-associated-control -->
				<label class="block font-semibold mb-2">Category *</label>
				<div class="flex gap-2 mb-2">
					<select bind:value={category} name="category" class="flex-1 p-2 border rounded" required>
						<option value="">Select a category</option>
						{#each allCategories as cat}
							<option value={cat}>{cat}</option>
						{/each}
					</select>
				</div>

				<!-- Add Custom Category -->
				<div class="flex gap-2 items-center">
					<input
						bind:value={newCategory}
						placeholder="Add new category"
						maxlength="50"
						class="flex-1 p-2 border rounded text-sm"
					/>
					<button
						type="button"
						on:click={addCustomCategory}
						class="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
					>
						Add
					</button>
				</div>

				{#if customCategories.length > 0}
					<div class="mt-2 flex flex-wrap gap-2">
						{#each customCategories as cat}
							<span class="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
								{cat}
								<button
									type="button"
									on:click={() => removeCustomCategory(cat)}
									class="text-red-600 hover:text-red-800 font-bold"
								>
									×
								</button>
							</span>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Title -->
			<div>
				<!-- svelte-ignore a11y-label-has-associated-control -->
				<label class="block font-semibold mb-2">Title *</label>
				<input
					bind:value={title}
					name="title"
					placeholder="Product Title"
					maxlength="200"
					class="w-full p-2 border rounded"
					required
				/>
			</div>

			<!-- Subtitle -->
			<div>
				<!-- svelte-ignore a11y-label-has-associated-control -->
				<label class="block font-semibold mb-2">Subtitle</label>
				<input
					bind:value={subtitle}
					name="subtitle"
					placeholder="Product Subtitle"
					maxlength="300"
					class="w-full p-2 border rounded"
				/>
			</div>

			<!-- Description -->
			<div>
				<!-- svelte-ignore a11y-label-has-associated-control -->
				<label class="block font-semibold mb-2">Description *</label>
				<textarea
					bind:value={description}
					name="description"
					placeholder="Brief product description"
					maxlength="1000"
					class="w-full p-2 border rounded"
					rows="3"
					required
				></textarea>
			</div>

			<!-- Overview -->
			<div>
				<!-- svelte-ignore a11y-label-has-associated-control -->
				<label class="block font-semibold mb-2">Overview</label>
				<textarea
					bind:value={overview}
					name="overview"
					placeholder="Detailed product overview"
					maxlength="2000"
					class="w-full p-2 border rounded"
					rows="4"
				></textarea>
			</div>

			<!-- Features -->
			<div>
				<!-- svelte-ignore a11y-label-has-associated-control -->
				<label class="block font-semibold mb-2">Features</label>
				{#each features as feature, i}
					<div class="flex gap-2 mb-2">
						<input
							bind:value={feature.key}
							placeholder="Feature name (e.g., BBoard)"
							maxlength="100"
							class="flex-1 p-2 border rounded"
						/>
						<input
							bind:value={feature.value}
							placeholder="Feature value (e.g., n257 band)"
							maxlength="200"
							class="flex-1 p-2 border rounded"
						/>
						<button
							type="button"
							on:click={() => removeFeature(i)}
							class="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
						>
							Remove
						</button>
					</div>
				{/each}
				<button
					type="button"
					on:click={addFeature}
					class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
				>
					+ Add Feature
				</button>
				<input
					type="hidden"
					name="features"
					value={JSON.stringify(
						features.filter((f) => f.key && f.value).map((f) => ({ [f.key]: f.value }))
					)}
				/>
			</div>

			<!-- Applications -->
			<div>
				<!-- svelte-ignore a11y-label-has-associated-control -->
				<label class="block font-semibold mb-2">Applications</label>
				{#each applications as app, i}
					<div class="flex gap-2 mb-2 items-center">
						<span class="text-gray-600">•</span>
						<input
							bind:value={applications[i]}
							placeholder="Enter application"
							maxlength="200"
							class="flex-1 p-2 border rounded"
						/>
						<button
							type="button"
							on:click={() => removeApplication(i)}
							class="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
						>
							Remove
						</button>
					</div>
				{/each}
				<button
					type="button"
					on:click={addApplication}
					class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
				>
					+ Add Application
				</button>
				<input
					type="hidden"
					name="applications"
					value={JSON.stringify(applications.filter((a) => a.trim()))}
				/>
			</div>

			{#if !isEditing}
				<div class="space-y-6">
					<div class="upload-container">
						<div>
							<label for="imageUpload" class="font-semibold mb-2">Image</label>
							<input type="file" id="imageUpload" accept="image/*" on:change={handleFileChange} />
							{#if previewUrl}
								<img
									src={previewUrl}
									alt="Preview"
									class="preview h-32 w-32 object-cover mt-2 rounded"
									on:error={handleImageError}
								/>
							{/if}
						</div>
						<div class="flex items-center mt-2">
							<button
								type="button"
								on:click={uploadImage}
								class="px-5 py-1.5 bg-gray-700 border border-gray-700 text-white rounded hover:bg-white hover:text-gray-700 transition-all duration-300"
								disabled={!imageSelected || imageUploaded}
							>
								Process Image
							</button>
							{#if imageUploaded}
								<span class="ml-2 text-green-500 text-sm flex items-center">
									<Icon icon="mdi:check-circle" class="w-4 h-4 mr-1" />
									Image processed successfully
								</span>
							{/if}
						</div>
						{#if imageError}
							<p class="text-red-500 text-xs mt-1">{imageError}</p>
						{/if}
					</div>
					<input type="hidden" name="image" bind:value={filename} />
				</div>
			{:else}
				<input type="hidden" name="image" bind:value={image} />
			{/if}
			<div class="flex justify-end gap-2 pt-4 border-t">
				<button
					type="button"
					on:click={() => {
						showForm = false;
					}}
					class="px-6 py-2 rounded border border-gray-400 hover:bg-gray-100"
				>
					Cancel
				</button>
				<button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
					{isEditing ? 'Update Product' : 'Create Product'}
				</button>
			</div>
		</form>
	</div>
</div>

<Toaster position="bottom-right" richColors />
