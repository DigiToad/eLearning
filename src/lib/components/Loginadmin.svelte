<script>
  import Icon from "@iconify/svelte";
  import { enhance, applyAction } from "$app/forms";
  import { toast, Toaster } from "svelte-sonner";
  import { goto } from "$app/navigation";
  import { onDestroy } from "svelte";

  let isOtpLogin = false;
  let email = "";
  let emailOrUsername = "";
  let password = "";
  let validErrorpass = "";
  let otpStatus = "";
  let showPassword = false;
  let isLoading = false;
  let enteredOtp = "";
  let errors = {};
  let form4;
  let timeLeft;
  let timerInterval;
  // let selectedRole = "user";

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  function validateEmail() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    } else {
      delete errors.email;
    }
  }

  function validateEmailOrUsername() {
    const value = emailOrUsername.trim();
    let newErrors = { ...errors };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValidUsername =
      /^[a-zA-Z][a-zA-Z0-9_]{2,}$/.test(value) &&
      /[a-zA-Z]/.test(value) &&
      !/^[0-9]+$/.test(value) &&
      !/^[_]+$/.test(value);
    if (!value) {
      newErrors.emailOrUsername = "*Required";
    } else if (!emailRegex.test(value) && !isValidUsername) {
      newErrors.emailOrUsername = "Enter a valid email or username";
    } else {
      delete newErrors.emailOrUsername;
    }
    errors = newErrors;
  }

  const handleFormSubmit = ({ formData }) => {
    // formData.append("role", selectedRole);
    return async ({ result, update }) => {
      if (result.type === "redirect") {
        await goto(result.location);
        return;
      }
      await applyAction(result);
      if (result.type === "failure") {
        toast.error(result.data.errorMsg);
      } else if (result.type === "success") {
        toast.success(result.data.errorMsg);
      }
    };
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  const startTimer = () => {
    clearInterval(timerInterval);
    timeLeft = 60;
    timerInterval = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft -= 1;
      } else {
        clearInterval(timerInterval);
      }
    }, 1000);
  };

  onDestroy(() => {
    if (timerInterval) clearInterval(timerInterval);
  });

  const handleResendOtp = () => {
    if (timeLeft === 0 && !isLoading) {
      form4.requestSubmit();
      startTimer();
    }
  };
</script>

<!-- FULL SCREEN CENTERED WRAPPER -->
<div
  class="min-h-screen bg-gradient-to-br from-gray-100 via-primary-50 to-primary-200 flex items-center justify-center p-4"
>
  <!-- CARD: left + right panels -->
  <div
    class="w-full max-w-5xl flex flex-col md:flex-row shadow-2xl rounded-2xl overflow-hidden"
  >
    <!-- ───── LEFT PANEL ───── -->
    <div
      class="md:w-2/5 w-full flex flex-col justify-between bg-[#4040cc] text-white p-8 md:p-10 relative overflow-hidden"
    >
      <!-- decorative circles -->
      <div
        class="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/5 pointer-events-none"
      ></div>
      <div
        class="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none"
      ></div>

      <!-- Logo -->
      <div class="relative z-10 mb-8 md:mb-0">
        <img src="/skillsblock.png" alt="Skills block" class="w-24" />
      </div>

      <!-- Headline -->
      <div class="relative z-10 my-8 md:my-0">
        <h1 class="text-2xl md:text-3xl font-extrabold leading-tight">
          <span class="text-[#F5A623]">Gamify</span> Learning, ✦<br />
          <span class="text-[#F5A623]">Simplify</span> Employment
        </h1>
      </div>

      <!-- Feature cards -->
      <div class="flex flex-col gap-3 relative z-10">
        <div class="bg-white/10 border border-white/20 rounded-2xl p-4">
          <div
            class="bg-white/15 rounded-lg w-9 h-9 flex items-center justify-center mb-3"
          >
            <Icon icon="heroicons:command-line" class="text-white w-5 h-5" />
          </div>
          <h3 class="font-bold text-sm mb-1">Learn Through Play ✦</h3>
          <p class="text-white/70 text-xs leading-relaxed">
            Master coding with interactive challenges and rewards
          </p>
        </div>
        <div class="bg-white/10 border border-white/20 rounded-2xl p-4">
          <div
            class="bg-white/15 rounded-lg w-9 h-9 flex items-center justify-center mb-3"
          >
            <Icon icon="heroicons:briefcase" class="text-white w-5 h-5" />
          </div>
          <h3 class="font-bold text-sm mb-1">Direct Placement</h3>
          <p class="text-white/70 text-xs leading-relaxed">
            Get placed in top tech companies
          </p>
        </div>
      </div>
    </div>

    <!-- ───── RIGHT PANEL ───── -->
    <div
      class="md:w-3/5 w-full bg-white flex items-center justify-center p-8 md:p-12"
    >
      <div class="w-full max-w-sm">
        <h2 class="text-2xl font-bold text-primary-600 mb-1">Sign In</h2>
        <p class="text-sm text-gray-500 mb-6">Welcome back!</p>

        <!-- Role Toggle -->
        <!-- <div class="mb-5">
          <label class="block text-sm font-medium text-gray-700 mb-2">Sign in as</label>
          <div class="flex rounded-lg bg-gray-100 p-1 gap-1"> -->
        <!-- <button
              type="button"
              on:click={() => (selectedRole = "user")}
              class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all duration-200
                {selectedRole === 'user' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
            >
              <Icon icon="heroicons:user" class="w-4 h-4" /> User
            </button> -->
        <!-- <button
              type="button"
              on:click={() => (selectedRole = "admin")}
              class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all duration-200
                {selectedRole === 'admin' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
            >
              <Icon icon="heroicons:shield-check" class="w-4 h-4" /> Admin
            </button> -->
        <!-- </div> -->
        <!-- </div> -->

        {#if isOtpLogin}
          <form
            method="POST"
            action="?/sendOtp"
            use:enhance={() => {
              isLoading = true;
              return async ({ result, update }) => {
                otpStatus = result.status;
                if (result.type === "failure") {
                  isLoading = false;
                  toast.error(result.data.errorMsg);
                } else if (result.type === "success") {
                  toast.success(result.data.errorMsg);
                  startTimer();
                }
                await applyAction(result);
                isLoading = false;
              };
            }}
            class="space-y-4"
          >
            <!-- <input type="hidden" name="role" value={selectedRole} /> -->

            <div class="space-y-1">
              <label for="email" class="block text-sm font-medium text-gray-700"
                >Email address</label
              >
              <div class="relative">
                <div
                  class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"
                >
                  <Icon icon="heroicons:envelope" class="text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  id="email"
                  bind:value={email}
                  on:input={validateEmail}
                  placeholder="username@example.com"
                  class="pl-10 w-full rounded-md border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-0"
                />
              </div>
              {#if errors.email}<p class="text-red-500 text-xs mt-1">
                  {errors.email}
                </p>{/if}
            </div>

            {#if otpStatus !== 200}
              <button
                type="submit"
                class="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-md py-2.5 font-medium transition-all flex items-center justify-center"
                disabled={isLoading}
              >
                {#if isLoading}
                  <Icon
                    icon="line-md:loading-alt-loop"
                    class="w-5 h-5 mr-2 animate-spin"
                  /> Sending..
                {:else}
                  <Icon icon="heroicons:paper-airplane" class="mr-2" /> Send OTP
                {/if}
              </button>
            {/if}

            {#if otpStatus === 200}
              <form
                action="?/verifyOtp"
                method="POST"
                use:enhance={({ formData }) => {
                  formData.append("email", email);
                  return async ({ result }) => {
                    if (result.type === "failure") {
                      toast.error(result.data.errorMsg);
                    } else if (result.type === "redirect") {
                      await goto(result.location);
                      location.reload();
                    } else if (result.type === "success") {
                      const { redirectTo } = result.data;
                      if (redirectTo) {
                        await goto(redirectTo);
                        location.reload();
                      } else {
                        toast.error(
                          "Verification successful, but no redirect URL provided!",
                        );
                      }
                    }
                    await applyAction(result);
                  };
                }}
                class="space-y-4"
              >
                <div
                  class="bg-primary-50 p-4 rounded-md border border-primary-100"
                >
                  <p class="text-gray-700 text-sm mb-3">
                    Enter the 6-digit OTP sent to your email.
                  </p>
                  <div class="flex gap-2 items-center">
                    <div class="relative flex-1">
                      <div
                        class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"
                      >
                        <Icon icon="heroicons:key" class="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        maxlength="6"
                        name="enteredOtp"
                        bind:value={enteredOtp}
                        on:input={(e) => {
                          enteredOtp = e.target.value
                            .replace(/[^0-9]/g, "")
                            .trim();
                        }}
                        placeholder="6-digit OTP"
                        class="pl-10 w-full rounded-md border border-gray-300 bg-white p-2.5 text-sm focus:border-primary-500 focus:ring-0"
                      />
                    </div>
                    <button
                      class="bg-primary-600 text-white text-sm py-2 px-4 rounded-md font-medium hover:bg-primary-700 transition-colors"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              </form>

              <form
                action="?/sendOtp"
                method="POST"
                use:enhance={({ formData }) => {
                  formData.append("email", email);
                  // formData.append("role", selectedRole);
                  return async ({ result }) => {
                    otpStatus = result.status;
                    if (result.type === "failure") {
                      toast.error(result.data.errorMsg);
                    } else if (result.type === "success") {
                      toast.success(result.data.errorMsg);
                      startTimer();
                    }
                    await applyAction(result);
                  };
                }}
              >
                {#if timeLeft > 0}
                  <div class="flex justify-center">
                    <span
                      class="text-sm px-4 py-2 rounded-full bg-primary-50 text-primary-700 border border-primary-200 flex items-center"
                    >
                      <Icon icon="heroicons:clock" class="mr-2" /> Resend in {formatTime(
                        timeLeft,
                      )}
                    </span>
                  </div>
                {:else}
                  <div class="flex justify-center mt-3">
                    <button
                      on:click={handleResendOtp}
                      type="submit"
                      class="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline flex items-center"
                    >
                      <Icon icon="heroicons:arrow-path" class="mr-1" /> Resend OTP
                    </button>
                  </div>
                {/if}
              </form>
            {/if}
          </form>
        {:else}
          <!-- Password Login -->
          <form
            method="POST"
            action="?/login"
            use:enhance={handleFormSubmit}
            class="space-y-4"
          >
            <!-- <input type="hidden" name="role" value={selectedRole} /> -->

            <div class="space-y-1">
              <label
                for="emailOrUsername"
                class="block text-sm font-medium text-gray-700">Email</label
              >
              <div class="relative">
                <div
                  class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"
                >
                  <Icon icon="heroicons:envelope" class="text-gray-400" />
                </div>
                <input
                  type="text"
                  name="emailOrUsername"
                  id="emailOrUsername"
                  bind:value={emailOrUsername}
                  on:input={validateEmailOrUsername}
                  placeholder="Enter your email"
                  class="pl-10 w-full rounded-md border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-0"
                />
              </div>
              {#if errors.emailOrUsername}<p class="text-red-500 text-xs mt-1">
                  {errors.emailOrUsername}
                </p>{/if}
            </div>

            <div class="space-y-1">
              <label
                for="password"
                class="block text-sm font-medium text-gray-700">Password</label
              >
              <div class="relative">
                <div
                  class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"
                >
                  <Icon icon="heroicons:lock-closed" class="text-gray-400" />
                </div>
                {#if showPassword}
                  <input
                    type="text"
                    name="password"
                    id="password"
                    placeholder="Password"
                    bind:value={password}
                    on:input={() => {
                      password = password.trim();
                      validErrorpass = !password
                        ? "Please enter a valid Password"
                        : "";
                    }}
                    class="pl-10 w-full rounded-md border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-0"
                  />
                {:else}
                  <input
                    type="password"
                    name="password"
                    id="password"
                    placeholder="Password"
                    bind:value={password}
                    on:input={() => {
                      password = password.trim();
                      validErrorpass = !password
                        ? "Please enter a valid Password"
                        : "";
                    }}
                    class="pl-10 w-full rounded-md border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-0"
                  />
                {/if}
                <button
                  type="button"
                  class="absolute top-3 right-2.5 text-gray-500 hover:text-gray-700 focus:outline-none"
                  on:click={() => (showPassword = !showPassword)}
                >
                  <Icon
                    icon={showPassword
                      ? "mdi:eye-off-outline"
                      : "mdi:eye-outline"}
                    class="w-5 h-5"
                  />
                </button>
              </div>
              {#if validErrorpass}<p class="text-red-500 text-xs mt-1">
                  {validErrorpass}
                </p>{/if}
            </div>

            <div class="flex justify-end">
              <a
                href="/admin/forgot"
                class="text-sm text-primary-600 hover:text-primary-700 hover:underline underline-offset-2"
              >
                Forgot password?
              </a>
            </div>
            <button
              type="submit"
              class="w-full bg-primary-500 hover:from-primary-500 hover:to-primary-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-lg py-3.5 px-4 font-semibold text-sm transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              <span> Sign In </span>
              <Icon
                icon="heroicons:arrow-right-on-rectangle"
                class="mr-2 w-5 h-5"
              />
            </button>
          </form>
        {/if}
      </div>
    </div>
  </div>
</div>

<Toaster position="bottom-right" richColors />
