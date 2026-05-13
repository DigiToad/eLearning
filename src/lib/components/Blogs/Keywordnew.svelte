<script>
	import { onMount, tick } from 'svelte';
	import { enhance, applyAction } from '$app/forms';
	import { Toaster, toast } from 'svelte-sonner';
	import { PUBLIC_WEBSITE_URL } from '$env/static/public';
	import Icon from '@iconify/svelte';

	export let categoryData;
	// console.log('blogData received from keyword page:', categoryData);
	$: selectedCategoryOrder = categoryData?.find((item) => item.title === category)?.id || '';
	let caturl = `${PUBLIC_WEBSITE_URL}/admin/dashboard/category`;
	/**
	 * @param {File} file - The image file to compress
	 * @param {number} maxWidth - Maximum width (default: 1920)
	 * @param {number} maxHeight - Maximum height (default: 1080)
	 * @param {number} quality - JPEG quality 0-1 (default: 0.8)
	 * @returns {Promise<File>} Compressed image file
	 */
	async function compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);

			reader.onload = (event) => {
				const img = new Image();
				img.src = event.target.result;
				img.onload = () => {
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
					const canvas = document.createElement('canvas');
					canvas.width = width;
					canvas.height = height;
					const ctx = canvas.getContext('2d');
					ctx.drawImage(img, 0, 0, width, height);
					canvas.toBlob(
						(blob) => {
							if (!blob) {
								reject(new Error('Canvas to Blob conversion failed'));
								return;
							}
							const compressedFile = new File([blob], file.name, {
								type: 'image/jpeg',
								lastModified: Date.now()
							});

							// console.log('Original size:', (file.size / 1024).toFixed(2), 'KB');
							// console.log('Compressed size:', (compressedFile.size / 1024).toFixed(2), 'KB');
							// console.log(
							// 	'Compression ratio:',
							// 	((1 - compressedFile.size / file.size) * 100).toFixed(1) + '%'
							// );

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

	let isSubmitting = false;

	// Image upload variables
	let file;
	let previewUrl = '';
	let filename;
	let imageUploaded = false;
	let imageSelected = false;
	let imageError = '';

	// Datasheet upload variables
	// let datasheetFile;
	// let datasheetFilename;
	// let datasheetUploaded = false;
	// let datasheetSelected = false;
	// let datasheetError = '';
	// let datasheet = '';
	// Datasheet upload variables
let datasheetFile;
let datasheetFilename;
let datasheetUploaded = false;
let datasheetSelected = false;
let datasheetError = '';
let datasheet = '';
let datasheetInputType = 'file'; // 'file' | 'url'
let datasheetUrl = '';

	// Validation error messages
	let errors = {
		title: '',
		description: '',
		category: '',
		keywords: '',
		image: '',
		datasheet: '',
		features: '',
		applications: '',
		overview: ''
	};

	let createModalOpen = false;
	let producturl = '';

	function closeCreateModal() {
		createModalOpen = false;
	}

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

		try {
			// If file is already small enough, use it directly
			if (selectedFile.size <= 2 * 1024 * 1024) {
				file = selectedFile;

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
				toast.success(`Image ready (${sizeKB} KB)`);
				return;
			}

			// Only compress if file is too large
			toast.warning('Large image detected. Compressing...');

			// Compress the image
			file = await compressImage(selectedFile, 1920, 1080, 0.85);

			// If compressed size is still too large, try higher compression
			if (file.size > 1 * 1024 * 1024) {
				toast.warning('Image still large. Trying higher compression...');
				file = await compressImage(selectedFile, 1600, 900, 0.7);
			}

			// If STILL too large after compression, reject
			if (file.size > 1 * 1024 * 1024) {
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
			toast.error('Failed to process image. Please try another file.');
			imageError = 'Failed to process image';
			imageSelected = false;
		}
	}

	async function handleDatasheetChange(event) {
		const selectedFile = event.target.files[0];
		if (!selectedFile) return;

		const allowedTypes = [
			'application/pdf',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/vnd.ms-excel',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		];

		if (!allowedTypes.includes(selectedFile.type)) {
			toast.error('Please select a valid document file (PDF, DOC, DOCX, XLS, XLSX)');
			datasheetError = 'Invalid file type';
			datasheetSelected = false;
			return;
		}

		// Check file size (max 5MB for documents)
		if (selectedFile.size > 2 * 1024 * 1024) {
			toast.error('Datasheet file size must be less than 5MB');
			datasheetError = 'File size too large (max 5MB)';
			datasheetSelected = false;
			return;
		}

		try {
			datasheetFile = selectedFile;

			// Process filename
			datasheetFilename = datasheetFile.name.trim();
			datasheetFilename = datasheetFilename
				.replace(/\s?\(\d+\)\./, '.')
				.replace(/[\\\/:*?"<>|()]/g, '-')
				.replace(/[^a-zA-Z0-9.-]/g, '-')
				.replace(/-+/g, '-')
				.replace(/^-+/, '')
				.replace(/-+$/, '');

			datasheetSelected = true;
			datasheetUploaded = false;
			datasheetError = '';

			const sizeKB = (datasheetFile.size / 1024).toFixed(2);
			toast.success(`Datasheet selected (${sizeKB} KB)`);
		} catch (error) {
			console.error('File processing error:', error);
			toast.error('Failed to process document. Please try another file.');
			datasheetError = 'Failed to process document';
			datasheetSelected = false;
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
				errors.image = '';
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

	async function uploadDatasheet() {
		if (!datasheetFile) {
			toast.warning('Please select a datasheet first.');
			return;
		}

		const formData = new FormData();
		formData.append('image', datasheetFile);
		formData.append('filename', datasheetFile.name);

		try {
			const response = await fetch('/pdfupload', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (response.ok) {
				datasheetUploaded = true;
				datasheetError = '';
				datasheetFilename = result.url;
				errors.datasheet = '';
				toast.success('Datasheet uploaded successfully!');
			} else {
				toast.error(result.error || 'Datasheet upload failed.');
				datasheetUploaded = false;
			}
		} catch (error) {
			console.error('Upload error:', error);
			toast.error('An error occurred while uploading the datasheet.');
			datasheetUploaded = false;
		}
	}

	function removeImage() {
		file = null;
		previewUrl = '';
		filename = '';
		imageSelected = false;
		imageUploaded = false;
		imageError = '';
		errors.image = '';
		const fileInput = document.getElementById('imageUpload');
		if (fileInput) fileInput.value = '';
		toast.success('Image removed');
	}

	function removeDatasheet() {
		// datasheetFile = null;
		datasheetFile = null;
		datasheetSelected = false;
		datasheetUploaded = false;
		datasheetInputType = 'file';
		datasheetUrl = '';
		datasheetFilename = '';
		// datasheetSelected = false;
		// datasheetUploaded = false;
		datasheetError = '';
		errors.datasheet = '';
		const fileInput = document.getElementById('datasheetUpload');
		if (fileInput) fileInput.value = '';
		toast.success('Datasheet removed');
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
	let subcategory = '';

	let customCategories = [];
	let newCategory = '';
	let imageType = 'url';
	let uploadedImage = null;
	let fileInput;
	let editor;
	let editorContainer;
	let overviewEditor;
	let overviewEditorContainer;
	let Quill;
	let keywords = '';

	let features = [{ key: '', value: '' }];
	let applications = [''];

	// Store original values for comparison
	let originalValues = {
		title: '',
		subtitle: '',
		description: '',
		overview: '',
		category: '',
		keywords: '',
		features: [],
		applications: []
	};

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
		// Reset all errors
		errors = {
			title: '',
			description: '',
			category: '',
			keywords: '',
			image: '',
			datasheet: '',
			features: '',
			applications: '',
			overview: ''
		};

		let isValid = true;

		// Validate title
		if (!sanitizeInput(title)) {
			errors.title = 'Title is required';
			isValid = false;
		} else if (title.length > 200) {
			errors.title = 'Title must be less than 200 characters';
			isValid = false;
		}

		// Validate description
		if (!sanitizeInput(description)) {
			errors.description = 'Description is required';
			isValid = false;
		} else if (description.length > 1000) {
			errors.description = 'Description must be less than 1000 characters';
			isValid = false;
		}

		// Validate category
		if (!sanitizeInput(category)) {
			errors.category = 'Category is required';
			isValid = false;
		}

		// Validate keywords
		if (!sanitizeInput(keywords)) {
			errors.keywords = 'Keywords are required';
			isValid = false;
		}

		// Validate overview
		if (!sanitizeInput(overview)) {
			errors.overview = 'Overview is required';
			isValid = false;
		}

		// Validate image - only required when creating new product
		if (!isEditing) {
			if (!imageSelected) {
				errors.image = 'Please select an image';
				isValid = false;
			} else if (!imageUploaded) {
				errors.image = 'Please process the selected image before submitting';
				isValid = false;
			} else if (!filename) {
				errors.image = 'Image processing failed. Please try again';
				isValid = false;
			}
		}

		// Validate datasheet (if selected)
		if (!isEditing && datasheetSelected && !datasheetUploaded) {
			errors.datasheet = 'Please process the selected datasheet before submitting';
			isValid = false;
		}

		// Validate features
		const validFeatures = features.filter((f) => sanitizeInput(f.key) && sanitizeInput(f.value));
		if (validFeatures.length === 0) {
			errors.features = 'At least one feature with both name and value is required';
			isValid = false;
		}

		// Validate applications
		const validApplications = applications.filter((a) => sanitizeInput(a));
		if (validApplications.length === 0) {
			errors.applications = 'At least one application is required';
			isValid = false;
		}

		return isValid;
	}

	function validateAndSanitize() {
		// Sanitize all inputs
		title = sanitizeInput(title);
		subtitle = sanitizeInput(subtitle);
		description = sanitizeInput(description);
		overview = sanitizeInput(overview);
		category = sanitizeInput(category);
		newCategory = sanitizeInput(newCategory);
		keywords = sanitizeInput(keywords);

		features = features.map((f) => ({
			key: sanitizeInput(f.key),
			value: sanitizeInput(f.value)
		}));
		applications = applications.map((a) => sanitizeInput(a));

		// Validate the form
		return validateForm();
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

	async function initOverviewEditor(initialContent = '') {
		if (!Quill) return;

		await tick();

		if (overviewEditor) {
			overviewEditor = null;
			overviewEditorContainer.innerHTML = '';
		}

		if (overviewEditorContainer && !overviewEditor) {
			overviewEditor = new Quill(overviewEditorContainer, {
				theme: 'snow',
				placeholder: 'Write detailed product overview...',
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

			overviewEditor.on('text-change', () => {
				overview = overviewEditor.root.innerHTML;
				errors.overview = ''; // Clear error when user types
			});

			if (initialContent) {
				overviewEditor.root.innerHTML = initialContent;
				overview = initialContent;
			}
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

		// initialize overview editor if necessary
		if (overviewEditorContainer && !overviewEditor) {
			await initOverviewEditor(overview || '');
		}

		if (isEditing && blogToEdit) {
			title = sanitizeInput(blogToEdit.title || '');
			subcategory = sanitizeInput(blogToEdit.subcategory || '');

			subtitle = sanitizeInput(blogToEdit.subtitle || '');
			description = sanitizeInput(blogToEdit.description || '');
			overview = sanitizeInput(blogToEdit.overview || '');
			category = sanitizeInput(blogToEdit.category || '');
			image = blogToEdit.image || '';
			datasheet = blogToEdit.datasheet || '';
			producturl = blogToEdit.producturl || '';
			content = blogToEdit.content || '';
			datasheetFilename = blogToEdit.datasheet || '';
			keywords = sanitizeInput(blogToEdit.keywords || '');
			imageType = image?.startsWith('http') ? 'url' : 'upload';
			features = parseFeaturesFromBackend(blogToEdit.features);
			applications = parseApplicationsFromBackend(blogToEdit.applications);
			// ✅ KEEP DATASHEET DURING EDIT
			if (blogToEdit.datasheet) {
				datasheet = blogToEdit.datasheet;
				datasheetFilename = blogToEdit.datasheet;
				datasheetUploaded = true;
				datasheetSelected = true;
			}
		}
	});

	$: if (showForm && (!isEditing || blogToEdit)) {
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
			subcategory = sanitizeInput(blogToEdit.subcategory || '');

			image = blogToEdit.image || '';
			datasheet = blogToEdit.datasheet || '';
			if (blogToEdit.datasheet) {
				datasheet = blogToEdit.datasheet;
				datasheetFilename = blogToEdit.datasheet;
				datasheetUploaded = true;
				datasheetSelected = true;
			}

			producturl = blogToEdit.producturl || '';
			content = blogToEdit.content || '';
			datasheetFilename = blogToEdit.datasheet || '';
			keywords = sanitizeInput(blogToEdit.keywords || '');
			imageType = image?.startsWith('http') ? 'url' : 'upload';
			features = parseFeaturesFromBackend(blogToEdit.features);
			applications = parseApplicationsFromBackend(blogToEdit.applications);

			// Store original values for comparison
			originalValues = {
				title,
				subtitle,
				description,
				overview,
				category,
				subcategory,
				keywords,
				features: JSON.parse(JSON.stringify(features)),
				applications: JSON.parse(JSON.stringify(applications))
			};

			if (overviewEditor) {
				overviewEditor.root.innerHTML = blogToEdit.overview || '';
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
			datasheet = '';
			subcategory = '';
			producturl = '';
			keywords = '';
			uploadedImage = null;
			datasheetFilename = '';
			// datasheetFile = null;
			// datasheetSelected = false;
			// datasheetUploaded = false;
			datasheetFile = null;
		datasheetSelected = false;
		datasheetUploaded = false;
		datasheetInputType = 'file';
		datasheetUrl = '';
			features = [{ key: '', value: '' }];
			applications = [''];

			// Reset errors
			errors = {
				title: '',
				description: '',
				category: '',
				keywords: '',
				image: '',
				datasheet: '',
				features: '',
				applications: '',
				overview: ''
			};

			if (overviewEditor) {
				overviewEditor.root.innerHTML = '';
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
	$: categoriesFromData = categoryData?.map((item) => item.title) || [];
	$: allCategories = [...new Set([...categoriesFromData, ...customCategories])];
	// Check if form has changes
	$: hasChanges =
		isEditing &&
		(title !== originalValues.title ||
			subtitle !== originalValues.subtitle ||
			description !== originalValues.description ||
			overview !== originalValues.overview ||
			category !== originalValues.category ||
			subcategory !== originalValues.subcategory ||
			keywords !== originalValues.keywords ||
			JSON.stringify(features) !== JSON.stringify(originalValues.features) ||
			JSON.stringify(applications) !== JSON.stringify(originalValues.applications));
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
			on:submit|preventDefault={(e) => {
				// Validate before allowing submission
				const isValid = validateAndSanitize();

				if (!isValid) {
					// Show toast for critical errors
					if (errors.image) toast.error(errors.image);
					if (errors.datasheet) toast.error(errors.datasheet);
					if (errors.overview) toast.error(errors.overview);
					if (errors.features) toast.error(errors.features);
					if (errors.applications) toast.error(errors.applications);
					return false;
				}

				// If validation passes, manually submit the form
				const form = e.target;
				isSubmitting = true;

				// Create FormData and submit
				// const formData = new FormData(form);
				const formData = new FormData(form);

				// 🔥 FORCE datasheet in edit mode
				if (isEditing && datasheet) {
					formData.set('datasheet', datasheet);
				}
				// console.log('FormData datasheet:', formData.get('datasheet'));

				fetch(form.action, {
					method: 'POST',
					body: formData
				})
					.then((response) => {
						// console.log('Raw response:', response);
						return response.json();
					})
					.then((result) => {
						// console.log('Parsed JSON result:', result);

						// SvelteKit serializes form responses in a special format
						let actualData = {};

						if (result?.type === 'success' && result?.data) {
							try {
								// Parse the stringified array: '[{"success":1,"message":2},true,"Blog updated successfully"]'
								const parsed = JSON.parse(result.data);

								// console.log('Parsed array:', parsed);

								// parsed[0] contains the index map: {"success":1,"message":2}
								// parsed[1] is the value at index 1 (true)
								// parsed[2] is the value at index 2 ("Blog updated successfully")

								if (Array.isArray(parsed) && parsed.length > 0) {
									const indexMap = parsed[0]; // {"success":1,"message":2}

									// Reconstruct the actual object using the indices
									actualData = {
										success: parsed[indexMap.success], // parsed[1] = true
										message: parsed[indexMap.message] // parsed[2] = "Blog updated successfully"
									};
								}
							} catch (e) {
								console.error('Error parsing nested data:', e);
							}
						} else {
							actualData = result;
						}

						// console.log('Actual data:', actualData);

						// Now actualData will be: { success: true, message: "Blog updated successfully" }

						if (actualData?.success === true || actualData?.success === 1) {
							const message = String(actualData?.message || 'Product saved successfully!');
							toast.success(message);

							setTimeout(() => {
								showForm = false;
								isSubmitting = false;
								window.location.reload(); // Reload to see updated data
							}, 2000);
						} else {
							const errorMsg = String(
								actualData?.error || actualData?.message || 'Something went wrong.'
							);
							toast.error(errorMsg);
							isSubmitting = false;
						}
					})
					.catch((error) => {
						console.error('Submission error:', error);
						toast.error('Failed to submit form. Please try again.');
						isSubmitting = false;
					});
			}}
		>
			<input name="Categoryorder" type="hidden" bind:value={selectedCategoryOrder} required />
			{#if blogToEdit}
				<input name="id" type="hidden" bind:value={blogToEdit.id} />
				<input name="Categoryorder" type="hidden" bind:value={selectedCategoryOrder} required />
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
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label class="block font-semibold">
				<span class="text-red-600">* Note:</span>
				If the category is not available, please add it from the Category page.
				<a href={caturl} class="text-blue-600 underline ml-1" rel="noopener noreferrer">
					{caturl}
				</a>
			</label>
			<!-- Category -->
			<div>
				<!-- svelte-ignore a11y-label-has-associated-control -->
				<label class="block font-semibold mb-2">Category *</label>
				<div class="flex gap-2 mb-2">
					<select
						bind:value={category}
						name="category"
						class="flex-1 p-2 border rounded {errors.category ? 'border-red-500' : ''}"
						on:change={() => (errors.category = '')}
					>
						<option value="">Select a category</option>
						{#each allCategories as cat}
							<option value={cat}>{cat}</option>
						{/each}
					</select>
				</div>
				{#if errors.category}
					<p class="text-red-500 text-sm mt-1">{errors.category}</p>
				{/if}
				<input name="Categoryorder" type="hidden" bind:value={selectedCategoryOrder} required />

				<!-- Add Custom Category -->
				<!-- <div class="flex gap-2 items-center mt-2">
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
				</div> -->

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
			<!-- Subcategory -->
			<div>
				<!-- svelte-ignore a11y-label-has-associated-control -->
				<label class="block font-semibold mb-2">
					Subcategory
					<span class="text-gray-400 text-sm">(optional)</span>
				</label>

				<input
					bind:value={subcategory}
					name="subcategory"
					placeholder="Enter subcategory (optional)"
					maxlength="100"
					class="w-full p-2 border rounded"
				/>
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
					class="w-full p-2 border rounded {errors.title ? 'border-red-500' : ''}"
					on:input={() => (errors.title = '')}
				/>
				{#if errors.title}
					<p class="text-red-500 text-sm mt-1">{errors.title}</p>
				{/if}
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
					class="w-full p-2 border rounded {errors.description ? 'border-red-500' : ''}"
					rows="3"
					on:input={() => (errors.description = '')}
				></textarea>
				{#if errors.description}
					<p class="text-red-500 text-sm mt-1">{errors.description}</p>
				{/if}
			</div>

			<!-- Keywords -->
			<div>
				<!-- svelte-ignore a11y-label-has-associated-control -->
				<label class="block font-semibold mb-2">Keywords *</label>
				<input
					bind:value={keywords}
					name="keywords"
					placeholder="Enter keywords separated by commas (e.g., wireless, 5G, antenna)"
					class="w-full p-2 border rounded"
				/>
				<p class="text-sm text-gray-500 mt-1">Separate keywords with commas</p>
				{#if errors.keywords}
					<p class="text-red-500 text-sm mt-1">{errors.keywords}</p>
				{/if}
			</div>

			<!-- Overview -->
			<div>
				<!-- svelte-ignore a11y-label-has-associated-control -->
				<label class="block font-semibold mb-2">Overview</label>
				<!-- this hidden input keeps form submission compatible with server-side handlers -->
				<textarea name="overview" bind:value={overview} class="hidden" aria-hidden="true"
				></textarea>
				<div
					bind:this={overviewEditorContainer}
					class="w-full p-2 border rounded min-h-[120px]"
				></div>
				{#if errors.overview}
					<p class="text-red-500 text-sm mt-1">{errors.overview}</p>
				{/if}
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
				{#if errors.features}
					<p class="text-red-500 text-sm mt-1">{errors.features}</p>
				{/if}
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
				{#if errors.applications}
					<p class="text-red-500 text-sm mt-1">{errors.applications}</p>
				{/if}
			</div>

			{#if !isEditing}
				<div class="space-y-6">
					<div class="upload-container">
						<div>
							<label for="imageUpload" class="font-semibold mb-2">Image *</label>
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
						<div class="flex items-center mt-2 gap-2">
							<button
								type="button"
								on:click={uploadImage}
								class="px-5 py-1.5 bg-gray-700 border border-gray-700 text-white rounded hover:bg-white hover:text-gray-700 transition-all duration-300"
								disabled={!imageSelected || imageUploaded}
							>
								Process Image
							</button>
							{#if imageSelected || imageUploaded}
								<button
									type="button"
									on:click={removeImage}
									class="px-5 py-1.5 bg-red-600 border border-red-600 text-white rounded hover:bg-white hover:text-red-600 transition-all duration-300"
								>
									Remove Image
								</button>
							{/if}
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

			{#if !isEditing}
			<div class="space-y-6">
				<div class="upload-container">
					<!-- Toggle -->
					<div class="flex items-center gap-1 mb-3">
						<!-- svelte-ignore a11y-label-has-associated-control -->
						<label class="font-semibold mr-2">Datasheet</label>
						<div class="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm">
							<button
								type="button"
								on:click={() => {
									datasheetInputType = 'file';
									datasheetUrl = '';
									datasheetError = '';
									errors.datasheet = '';
								}}
								class="px-3 py-1.5 transition-colors duration-200 {datasheetInputType === 'file'
									? 'bg-gray-700 text-white'
									: 'bg-white text-gray-600 hover:bg-gray-100'}"
							>
								<Icon icon="mdi:file-upload-outline" class="inline w-4 h-4 mr-1" />
								File Upload
							</button>
							<button
								type="button"
								on:click={() => {
									datasheetInputType = 'url';
									datasheetFile = null;
									datasheetSelected = false;
									datasheetUploaded = false;
									datasheetFilename = '';
									datasheetError = '';
									errors.datasheet = '';
									const fi = document.getElementById('datasheetUpload');
									if (fi) fi.value = '';
								}}
								class="px-3 py-1.5 transition-colors duration-200 {datasheetInputType === 'url'
									? 'bg-gray-700 text-white'
									: 'bg-white text-gray-600 hover:bg-gray-100'}"
							>
								<Icon icon="mdi:link-variant" class="inline w-4 h-4 mr-1" />
								URL
							</button>
						</div>
					</div>

					{#if datasheetInputType === 'file'}
						<!-- File upload mode -->
						<div>
							<input
								type="file"
								id="datasheetUpload"
								accept=".pdf,.doc,.docx,.xls,.xlsx"
								on:change={handleDatasheetChange}
							/>
							{#if datasheetSelected}
								<p class="text-sm text-gray-600 mt-2">Selected: {datasheetFilename}</p>
							{/if}
						</div>
						<div class="flex items-center mt-2 gap-2">
							<button
								type="button"
								on:click={uploadDatasheet}
								class="px-5 py-1.5 bg-gray-700 border border-gray-700 text-white rounded hover:bg-white hover:text-gray-700 transition-all duration-300"
								disabled={!datasheetSelected || datasheetUploaded}
							>
								Process Datasheet
							</button>
							{#if datasheetSelected || datasheetUploaded}
								<button
									type="button"
									on:click={removeDatasheet}
									class="px-5 py-1.5 bg-red-600 border border-red-600 text-white rounded hover:bg-white hover:text-red-600 transition-all duration-300"
								>
									Remove Datasheet
								</button>
							{/if}
							{#if datasheetUploaded}
								<span class="ml-2 text-green-500 text-sm flex items-center">
									<Icon icon="mdi:check-circle" class="w-4 h-4 mr-1" />
									Datasheet processed successfully
								</span>
							{/if}
						</div>
					{:else}
						<!-- URL mode -->
						<div>
							<input
								type="url"
								bind:value={datasheetUrl}
								placeholder="https://example.com/datasheet.pdf"
								class="w-full p-2 border rounded {datasheetError ? 'border-red-500' : ''}"
								on:input={() => {
									datasheetError = '';
									errors.datasheet = '';
									// Mark as "uploaded" (no processing needed) once URL is entered
									if (datasheetUrl.trim()) {
										datasheetFilename = datasheetUrl.trim();
										datasheetUploaded = true;
										datasheetSelected = true;
									} else {
										datasheetFilename = '';
										datasheetUploaded = false;
										datasheetSelected = false;
									}
								}}
							/>
							{#if datasheetUrl.trim()}
								<span class="mt-2 text-green-500 text-sm flex items-center">
									<Icon icon="mdi:check-circle" class="w-4 h-4 mr-1" />
									URL ready — no processing needed
								</span>
							{/if}
						</div>
					{/if}

					{#if datasheetError}
						<p class="text-red-500 text-xs mt-1">{datasheetError}</p>
					{/if}
					{#if errors.datasheet}
						<p class="text-red-500 text-xs mt-1">{errors.datasheet}</p>
					{/if}
				</div>

				<!-- Single hidden input that carries whichever value is active -->
				<input
					type="hidden"
					name="datasheet"
					value={datasheetInputType === 'url' ? datasheetUrl : datasheetFilename}
				/>
			</div>
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
				<button
					type="submit"
					class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
					disabled={isSubmitting || (isEditing && !hasChanges)}
				>
					{#if isSubmitting}
						<span class="flex items-center gap-2">
							<Icon icon="mdi:loading" class="w-5 h-5 animate-spin" />
							{isEditing ? 'Updating...' : 'Creating...'}
						</span>
					{:else if isEditing && !hasChanges}
						No Changes to Update
					{:else}
						{isEditing ? 'Update Product' : 'Create Product'}
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>

<Toaster position="bottom-right" richColors />
