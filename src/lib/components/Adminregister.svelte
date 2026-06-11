<script>
  import { enhance, applyAction } from "$app/forms";
  import { toast, Toaster } from "svelte-sonner";
  import Icon from "@iconify/svelte";
  import { goto } from "$app/navigation";

  let firstName = "";
  let email = "";
  let password = "";
  let passwordConfirm = "";
  let passwordVisible = false;
  let confirmPasswordVisible = false;
  let typing = false;
  let passwordStrength = 0;
  let isProcessing = false;
  let showRedirectModal = false;
  let errors = {};

  const role = "admin"; // hardcoded

  function validateFirstName() {
    let e = { ...errors };
    if (!firstName.trim()) { e.firstName = "Required"; }
    else if (!/^[a-zA-Z\s]+$/.test(firstName)) { e.firstName = "Name can only contain letters and spaces"; }
    else { delete e.firstName; }
    errors = e;
  }

  function validateEmail() {
    let e = { ...errors };
    if (!email) { e.email = "Required"; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { e.email = "Please enter a valid email."; }
    else { delete e.email; }
    errors = e;
  }

  function calculateStrength(pw) {
    let s = 0;
    if (pw.length >= 8) s += 25;
    if (/[A-Z]/.test(pw)) s += 25;
    if (/\d/.test(pw)) s += 25;
    if (/[!@#$%^&*\-]/.test(pw)) s += 25;
    return s;
  }

  function validatePassword() {
    typing = password.length > 0;
    let e = { ...errors };
    if (!password) { e.password = "Required"; passwordStrength = 0; }
    else if (password.length < 8) { e.password = "At least 8 characters required"; passwordStrength = calculateStrength(password); }
    else if (password.toLowerCase().includes("password")) { e.password = "Cannot contain common words"; passwordStrength = calculateStrength(password); }
    else if (/[^a-zA-Z0-9!@#$%^&*\-]/.test(password)) { e.password = "Only !@#$%^&*- special characters allowed"; passwordStrength = calculateStrength(password); }
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*\-])[A-Za-z\d!@#$%^&*\-]{8,}$/.test(password)) { e.password = "Password doesn't meet all requirements"; passwordStrength = 50; }
    else { delete e.password; passwordStrength = calculateStrength(password); }
    errors = e;
  }

  function validateConfirmPassword() {
    let e = { ...errors };
    if (!passwordConfirm) { e.passwordConfirm = "Required"; }
    else if (passwordConfirm !== password) { e.passwordConfirm = "Passwords do not match"; }
    else { delete e.passwordConfirm; }
    errors = e;
  }

  function validateForm() {
    errors = {};
    validateFirstName();
    validateEmail();
    validatePassword();
    validateConfirmPassword();
    if (Object.keys(errors).length > 0) {
      toast.error("Please fill all required fields correctly");
      return false;
    }
    return true;
  }

  function togglePasswordVisibility() {
    passwordVisible = !passwordVisible;
    const input = document.getElementById("password");
    if (input) input.type = passwordVisible ? "text" : "password";
  }

  function toggleConfirmPasswordVisibility() {
    confirmPasswordVisible = !confirmPasswordVisible;
    const input = document.getElementById("passwordConfirm");
    if (input) input.type = confirmPasswordVisible ? "text" : "password";
  }

  async function handleFormSubmission({ cancel, formData }) {
    if (!validateForm()) { cancel(); return; }
    isProcessing = true;
    formData.append("role", role); // send role as admin
    return async ({ result, update }) => {
      isProcessing = false;
      if (result.type === "redirect") { await applyAction(result); }
      if (result.type === "success") {
        if (result.data.success) {
          await update();
          toast.success(result.data.message);
          await goto("/admin/dashboard");
          location.reload();
        } else {
          const errorText = result.data.message;
          if (errorText === "This email already exists. Please login or try with another.") {
            showRedirectModal = true;
          } else {
            toast.error(errorText);
          }
        }
      }
    };
  }

  function handleRedirectConfirm() { showRedirectModal = false; goto("/login"); }
  function handleRedirectCancel() { showRedirectModal = false; }
</script>

<div class="p-6 bg-gray-50 flex">

  <div class="flex-1 flex items-center justify-center px-6 ">
    <div class="w-full ">
      <div class="mb-2">
        <span class="text-primary-500 text-xs font-semibold tracking-widest uppercase mb-1.5 block">Admin Setup</span>
        <h2 class="text-gray-900 text-2xl font-bold leading-tight">Create Admin Account</h2>
       
      </div>


      <div class="flex items-center gap-2 mb-6 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 w-fit">
        <Icon icon="heroicons:shield-check" class="text-primary-500 w-4 h-4" />
        <span class="text-primary-500 text-xs font-bold tracking-wide uppercase">Registering as Admin</span>
      </div>

      <form method="POST" action="?/register" use:enhance={handleFormSubmission} class="space-y-4">
        <input type="hidden" name="role" value={role} />
        <div>
          <label for="firstName" class="block text-xs font-semibold text-gray-500 mb-1.5">
            Full Name <span class="text-primary-500">*</span>
          </label>
          <div class="relative">
            <input
              id="firstName" type="text" name="firstName" maxlength="50"
              bind:value={firstName} placeholder="Enter your full name"
              on:input={(e) => { firstName = e.target.value.trimStart(); validateFirstName(); }}
              class="w-full h-10 pl-3 pr-10 rounded-lg border text-sm text-gray-900 placeholder-gray-300 bg-white outline-none transition-all duration-150
                {errors.firstName ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-indigo-100'}"
            />
            <Icon icon="mdi:account-outline" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-base pointer-events-none" />
          </div>
          {#if errors.firstName}
            <p class="text-red-500 text-xs font-medium mt-1 flex items-center gap-1">
              <Icon icon="mdi:alert-circle-outline" class="text-xs flex-shrink-0" />{errors.firstName}
            </p>
          {/if}
        </div>

        <div>
          <label for="email" class="block text-xs font-semibold text-gray-500 mb-1.5">
            Email Address <span class="text-primary-500">*</span>
          </label>
          <div class="relative">
            <input
              type="email" id="email" name="email" maxlength="100"
              bind:value={email} on:input={validateEmail} placeholder="you@example.com"
              class="w-full h-10 pl-3 pr-10 rounded-lg border text-sm text-gray-900 placeholder-gray-300 bg-white outline-none transition-all duration-150
                {errors.email ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-indigo-100'}"
            />
            <Icon icon="mdi:email-outline" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-base pointer-events-none" />
          </div>
          {#if errors.email}
            <p class="text-red-500 text-xs font-medium mt-1 flex items-center gap-1">
              <Icon icon="mdi:alert-circle-outline" class="text-xs flex-shrink-0" />{errors.email}
            </p>
          {/if}
        </div>
        <div>
          <label for="password" class="block text-xs font-semibold text-gray-500 mb-1.5">
            Password <span class="text-primary-500">*</span>
          </label>
          <div class="relative">
            <input
              id="password" name="password" type="password" maxlength="50"
              bind:value={password}
              on:input={(e) => { password = e.target.value.trim(); validatePassword(); }}
              placeholder="Create a strong password"
              class="w-full h-10 px-3 pr-10 rounded-lg border text-sm text-gray-900 placeholder-gray-300 bg-white outline-none transition-all duration-150
                {errors.password ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-indigo-100'}"
            />
            <button type="button" on:click={togglePasswordVisibility}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              aria-label={passwordVisible ? "Hide password" : "Show password"}>
              <Icon icon={passwordVisible ? "mdi:eye-off-outline" : "mdi:eye-outline"} class="w-[17px] h-[17px]" />
            </button>
          </div>
          {#if errors.password}
            <p class="text-red-500 text-xs font-medium mt-1 flex items-center gap-1">
              <Icon icon="mdi:alert-circle-outline" class="text-xs flex-shrink-0" />{errors.password}
            </p>
          {/if}
        </div>
        {#if typing}
          <div class="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
            <div class="grid grid-cols-2 gap-y-2 gap-x-4 mb-3">
              {#each [
                { label: "No common words", pass: !password.toLowerCase().includes("password") },
                { label: "8+ characters", pass: password.length >= 8 },
                { label: "Uppercase & numbers", pass: /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) },
                { label: "Special character", pass: /[!@#$%^&*\-]/.test(password) }
              ] as rule}
                <div class="flex items-center gap-1.5 text-xs font-medium {rule.pass ? 'text-primary-500' : 'text-gray-400'}">
                  <Icon icon={rule.pass ? 'lets-icons:check-fill' : 'lets-icons:close-ring-duotone'} class="w-3.5 h-3.5 flex-shrink-0" />
                  {rule.label}
                </div>
              {/each}
            </div>
            <div class="flex gap-1 mb-1.5">
              {#each [25, 50, 75, 100] as seg}
                <div class="flex-1 h-1.5 rounded-full transition-all duration-300
                  {passwordStrength >= seg
                    ? (passwordStrength <= 50 ? 'bg-red-400' : passwordStrength <= 75 ? 'bg-yellow-400' : 'bg-primary-500')
                    : 'bg-gray-200'}">
                </div>
              {/each}
            </div>
            <p class="text-xs font-semibold {passwordStrength <= 50 ? 'text-red-500' : passwordStrength <= 75 ? 'text-yellow-600' : 'text-primary-500'}">
              {passwordStrength <= 25 ? 'Very Weak' : passwordStrength <= 50 ? 'Weak' : passwordStrength <= 75 ? 'Moderate' : 'Strong'}
            </p>
          </div>
        {/if}

        <div>
          <label for="passwordConfirm" class="block text-xs font-semibold text-gray-500 mb-1.5">
            Confirm Password <span class="text-primary-500">*</span>
          </label>
          <div class="relative">
            <input
              id="passwordConfirm" name="confirmpassword" type="password" maxlength="50"
              bind:value={passwordConfirm}
              on:input={(e) => { passwordConfirm = e.target.value.trim(); validateConfirmPassword(); }}
              placeholder="Repeat your password"
              class="w-full h-10 px-3 pr-10 rounded-lg border text-sm text-gray-900 placeholder-gray-300 bg-white outline-none transition-all duration-150
                {errors.passwordConfirm ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-indigo-100'}"
            />
            <button type="button" on:click={toggleConfirmPasswordVisibility}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              aria-label={confirmPasswordVisible ? "Hide confirm password" : "Show confirm password"}>
              <Icon icon={confirmPasswordVisible ? "mdi:eye-off-outline" : "mdi:eye-outline"} class="w-[17px] h-[17px]" />
            </button>
          </div>
          {#if errors.passwordConfirm}
            <p class="text-red-500 text-xs font-medium mt-1 flex items-center gap-1">
              <Icon icon="mdi:alert-circle-outline" class="text-xs flex-shrink-0" />{errors.passwordConfirm}
            </p>
          {/if}
        </div>

        <button
          type="submit"
          class="w-full h-11 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2
            bg-primary-500 hover:bg-[#3535b8] active:bg-[#2a2a99]
            transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-px
            disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 mt-2"
          disabled={isProcessing}
        >
          {#if isProcessing}
            <Icon icon="line-md:loading-alt-loop" class="text-lg" />
            Setting up your account...
          {:else}
            <Icon icon="heroicons:shield-check" class="text-lg" />
            Create Admin Account
          {/if}
        </button>
      </form>
    </div>
  </div>
</div>

<Toaster position="bottom-right" richColors />

{#if showRedirectModal}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4"
    on:click={handleRedirectCancel}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="bg-white rounded-2xl p-7 max-w-[360px] w-full shadow-2xl" on:click|stopPropagation>
      <div class="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
        <Icon icon="mdi:email-alert-outline" class="text-primary-500 text-xl" />
      </div>
      <h2 class="text-gray-900 text-base font-bold mb-1.5">Email Already Registered</h2>
      <p class="text-gray-500 text-sm leading-relaxed mb-6">
        This email already has an account. Would you like to sign in instead?
      </p>
      <div class="flex gap-3 justify-end">
        <button on:click={handleRedirectCancel}
          class="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button on:click={handleRedirectConfirm}
          class="px-5 py-2.5 text-sm font-bold text-white bg-primary-500 hover:bg-[#3535b8] rounded-lg transition-colors">
          Go to Login
        </button>
      </div>
    </div>
  </div>
{/if}