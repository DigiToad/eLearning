<script>
    import { enhance, applyAction } from "$app/forms";
    import { toast } from "svelte-sonner";
    import { Toaster } from "svelte-sonner";
    import { goto } from "$app/navigation"; 
    let form;
    let email = "";
    let emailError = "";
    let loading = false;

    $: successMessage = "";
    $: errorMessage = "";
</script>

<main class="min-h-screen bg-gradient-to-br from-primary-50 via-green-50 to-emerald-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
        <!-- Card with green accent -->
        <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
            <!-- Header with gradient -->
            <div class="bg-gradient-to-r from-primary-400 to-primary-500 p-8 text-center">
                <div class="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                </div>
                <h1 class="text-3xl font-bold text-white mb-2">Forgot Password?</h1>
                <p class="text-white/90 text-sm">No worries, we'll send you reset instructions</p>
            </div>

            <!-- Form content -->
            <div class="p-8">
                {#if successMessage}
                    <div class="bg-green-50 border-l-4 border-primary-500 p-4 rounded-lg mb-6">
                        <div class="flex items-start">
                            <svg class="w-5 h-5 text-primary-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                            </svg>
                            <div>
                                <p class="text-sm font-medium text-green-800">Success!</p>
                                <p class="text-sm text-green-700 mt-1">{successMessage}</p>
                            </div>
                        </div>
                    </div>
                {:else}
                    {#if errorMessage}
                        <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
                            <div class="flex items-start">
                                <svg class="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                                </svg>
                                <div>
                                    <p class="text-sm font-medium text-red-800">Error</p>
                                    <p class="text-sm text-red-700 mt-1">{errorMessage}</p>
                                </div>
                            </div>
                        </div>
                    {/if}

                    <form 
                        use:enhance={() => {
                            return async ({ result }) => {
                                loading = false;
                                if (result.data.success) {
                                    if (result.data.redirect) {
                                        goto(result.data.redirect); 
                                        return;
                                    }
                                    successMessage = "Reset link sent successfully";
                                    toast.success(result.data.message);
                                    email = "";
                                    emailError = "";
                                    form = false;
                                } else {
                                    successMessage = "";
                                    toast.error(result.data.message);
                                }
                                
                                await applyAction(result);
                            };
                        }}
                        method="POST"
                        action="?/resetrequest"
                        on:submit={() => (loading = true)}
                        class="space-y-6"
                    >
                        <div>
                            <label for="email" class="block text-sm font-semibold text-gray-700 mb-2">
                                Email Address
                            </label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <input 
                                    id="email" 
                                    type="email" 
                                    name="email" 
                                    placeholder="Enter your email address"
                                    class="pl-11 w-full rounded-lg border-2 border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200 transition-all duration-200 outline-none"
                                    class:border-red-300={emailError}
                                    class:focus:border-red-500={emailError}
                                    class:focus:ring-red-200={emailError}
                                    bind:value={email}
                                    on:input={() => {
                                        const emailRegex = /^\S+@\S+\.\S+$/;
                                        emailError = !email || !emailRegex.test(email)
                                            ? "Please enter a valid email address"
                                            : "";
                                    }}
                                />
                            </div>
                            {#if emailError}
                                <p class="mt-2 text-sm text-red-600 flex items-center">
                                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                    </svg>
                                    {emailError}
                                </p>
                            {/if}
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || emailError}
                            class="w-full bg-gradient-to-r from-primary-400 to-primary-500 hover:from-primary-500 hover:to-primary-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-lg py-3.5 px-4 font-semibold text-sm transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] flex items-center justify-center space-x-2"
                        >
                            {#if loading}
                                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Sending Reset Link...</span>
                            {:else}
                                <span>Send Reset Link</span>
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            {/if}
                        </button>
                    </form>
                {/if}

                <!-- Back to login -->
                <div class="mt-6 text-center">
                    <a href="/admin/login" class="text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center group transition-colors duration-200">
                        <svg class="w-4 h-4 mr-1 transform group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to login
                    </a>
                </div>
            </div>
        </div>

        <!-- Additional help text -->
       
    </div>
</main>

<Toaster position="bottom-right" richColors />