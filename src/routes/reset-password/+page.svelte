<script>
    import { toast, Toaster } from "svelte-sonner";
    import { enhance } from '$app/forms';
    import { goto , invalidateAll } from '$app/navigation'; // ← add this import


    export let data;
    export let form; 

    let password = '';
    let confirmPassword = '';
    let passwordError = '';
    let confirmPasswordError = '';
    let loading = false;
    let showpassword = false;
    let showconfirmPassword = false;

    $: if (form?.message) {
        toast.error(form.message);
    }

    function validatePassword() {
        if (password.length < 8) {
            passwordError = "Password must be at least 8 characters";
        } else {
            passwordError = "";
        }
    }

    function validateConfirmPassword() {
        if (confirmPassword !== password) {
            confirmPasswordError = "Passwords do not match";
        } else {
            confirmPasswordError = "";
        }
    }


// Update the enhance callback:

</script>

<Toaster position="bottom-right" richColors />

<main class="min-h-screen bg-gradient-to-br from-primary-50 via-green-50 to-emerald-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
        {#if data.showForm}
            <!-- Card with green accent -->
            <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
                <!-- Header with gradient -->
                <div class="bg-gradient-to-r from-primary-400 to-primary-500 p-8 text-center">
                    <div class="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 class="text-3xl font-bold text-white mb-2">Reset Your Password</h1>
                    <p class="text-white/90 text-sm">Enter your new password below</p>
                </div>

                <!-- Form content -->
                <div class="p-8">
                    <form 
                        method="POST" 
                        action="?/resetPassword" 
                       use:enhance={() => {
    loading = true;
    return async ({ result, update }) => {
        loading = false;
        if (result.type === 'failure') {
            toast.error(result.data?.message || "An error occurred");
            await update();
        } else if (result.type === 'redirect') {
            // ✅ Handle the redirect manually after showing toast
            toast.success("Password reset successfully!");
            setTimeout(() => goto(result.location)); // small delay so user sees toast
                        await invalidateAll(); 

        }
    };
}}
                        on:submit={() => (loading = true)}
                        class="space-y-6"
                    >
                        <input type="hidden" name="token" value={data.token} />
                        
                        <div>
                            <label for="password" class="block text-sm font-semibold text-gray-700 mb-2">
                                New Password
                            </label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                {#if showpassword}
                                    <input 
                                        id="password"
                                        type="text"
                                        name="password" 
                                        bind:value={password}
                                        on:input={validatePassword}
                                        required 
                                        placeholder="Enter new password"
                                        class="pl-11 pr-11 w-full rounded-lg border-2 border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200 transition-all duration-200 outline-none"
                                        class:border-red-300={passwordError}
                                        class:focus:border-red-500={passwordError}
                                        class:focus:ring-red-200={passwordError}
                                    />
                                {:else}
                                    <input 
                                        id="password"
                                        type="password"
                                        name="password" 
                                        bind:value={password}
                                        on:input={validatePassword}
                                        required 
                                        placeholder="Enter new password"
                                        class="pl-11 pr-11 w-full rounded-lg border-2 border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200 transition-all duration-200 outline-none"
                                        class:border-red-300={passwordError}
                                        class:focus:border-red-500={passwordError}
                                        class:focus:ring-red-200={passwordError}
                                    />
                                {/if}
                                <button 
                                    type="button" 
                                    class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:text-gray-600 focus:outline-none transition-colors duration-200 cursor-pointer"
                                    on:click={() => showpassword = !showpassword}
                                >
                                    {#if showpassword}
                                        <svg class="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                        </svg>
                                    {:else}
                                        <svg class="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    {/if}
                                </button>
                            </div>
                            {#if passwordError}
                                <p class="mt-2 text-sm text-red-600 flex items-center">
                                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                    </svg>
                                    {passwordError}
                                </p>
                            {/if}
                            <p class="mt-2 text-xs text-gray-500">Must be at least 8 characters long</p>
                        </div>

                        <div>
                            <label for="confirmPassword" class="block text-sm font-semibold text-gray-700 mb-2">
                                Confirm Password
                            </label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                {#if showconfirmPassword}
                                    <input 
                                        id="confirmPassword"
                                        type="text"
                                        name="confirmPassword" 
                                        bind:value={confirmPassword}
                                        on:input={validateConfirmPassword}
                                        required 
                                        placeholder="Confirm new password"
                                        class="pl-11 pr-11 w-full rounded-lg border-2 border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200 transition-all duration-200 outline-none"
                                        class:border-red-300={confirmPasswordError}
                                        class:focus:border-red-500={confirmPasswordError}
                                        class:focus:ring-red-200={confirmPasswordError}
                                    />
                                {:else}
                                    <input 
                                        id="confirmPassword"
                                        type="password"
                                        name="confirmPassword" 
                                        bind:value={confirmPassword}
                                        on:input={validateConfirmPassword}
                                        required 
                                        placeholder="Confirm new password"
                                        class="pl-11 pr-11 w-full rounded-lg border-2 border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200 transition-all duration-200 outline-none"
                                        class:border-red-300={confirmPasswordError}
                                        class:focus:border-red-500={confirmPasswordError}
                                        class:focus:ring-red-200={confirmPasswordError}
                                    />
                                {/if}
                                <button 
                                    type="button" 
                                    class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:text-gray-600 focus:outline-none transition-colors duration-200 cursor-pointer"
                                    on:click={() => showconfirmPassword = !showconfirmPassword}
                                >
                                    {#if showconfirmPassword}
                                        <svg class="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                        </svg>
                                    {:else}
                                        <svg class="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    {/if}
                                </button>
                            </div>
                            {#if confirmPasswordError}
                                <p class="mt-2 text-sm text-red-600 flex items-center">
                                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                    </svg>
                                    {confirmPasswordError}
                                </p>
                            {/if}
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            class="w-full bg-gradient-to-r from-primary-400 to-primary-500 hover:from-primary-500 hover:to-primary-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-lg py-3.5 px-4 font-semibold text-sm transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] flex items-center justify-center space-x-2"
                        >
                            {#if loading}
                                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Resetting Password...</span>
                            {:else}
                                <span>Reset Password</span>
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            {/if}
                        </button>
                    </form>

                    <!-- Back to login -->
                    <div class="mt-6 text-center">
                        <a href="/login" class="text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center group transition-colors duration-200">
                            <svg class="w-4 h-4 mr-1 transform group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to login
                        </a>
                    </div>
                </div>
            </div>
        {:else}
            <!-- Error state card -->
            <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
                <!-- Error header -->
                <div class="bg-gradient-to-r from-red-400 to-red-500 p-8 text-center">
                    <div class="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 class="text-3xl font-bold text-white mb-2">Link Inactive</h1>
                    <p class="text-white/90 text-sm">This reset link is no longer valid</p>
                </div>

                <!-- Error content -->
                <div class="p-8 text-center space-y-6">
                    <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                        <p class="text-sm text-red-700">{data.message}</p>
                    </div>

                    <div class="space-y-3">
                        <p class="text-sm text-gray-600">
                            Your reset link may have expired or already been used.
                        </p>
                        <p class="text-sm text-gray-600">
                            Please request a new password reset link.
                        </p>
                    </div>

                    <div class="flex flex-col space-y-3">
                        <a 
                            href="/forgot" 
                            class="w-full bg-gradient-to-r from-primary-400 to-primary-500 hover:from-primary-500 hover:to-primary-600 text-white rounded-lg py-3.5 px-4 font-semibold text-sm transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] flex items-center justify-center space-x-2"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Request New Reset Link</span>
                        </a>
                        
                        <a 
                            href="/login" 
                            class="text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center justify-center group transition-colors duration-200"
                        >
                            <svg class="w-4 h-4 mr-1 transform group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to login
                        </a>
                    </div>
                </div>
            </div>
        {/if}

       
    </div>
</main>