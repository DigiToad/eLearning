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

  const handleFormSubmit = ({ cancel }) => {
    return async ({ result, update }) => {
      console.log("form result:", result);

      if (result.type === "redirect") {
        console.log("Redirecting to:", result.location);
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
    if (timeLeft === 0 && !loadingPhone) {
      form4.requestSubmit();
      startTimer();
    }
  };
</script>

<div
  class="min-h-screen bg-gradient-to-br from-gray-100 via-primary-50 to-primary-300 flex items-center justify-center p-4"
>
  
  <!-- <div class="w-full max-w-5xl mt-10"> -->
  

      <div
        class="w-full   max-w-5xl md:w-2/5 items-center justify-center   bg-white  relative z-10 p-4 md:p-10"
      >
        <div class="max-w-md mx-auto">
          <h2 class="text-2xl font-bold text-primary-600 mb-2">Sign In</h2>
          
          {#if isOtpLogin}
            <form
              method="POST"
              action="?/sendOtp"
              use:enhance={() => {
                isLoading = true;
                return async ({ result, update }) => {
                  // console.log(result);
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
              <div class="space-y-1">
                <label
                  for="email"
                  class="block text-sm font-medium text-gray-700"
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
                    class="pl-10 w-full rounded-md border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-0 focus:ring-primary-500"
                  />
                </div>
                {#if errors.email}
                  <p class="text-red-500 text-xs mt-1">{errors.email}</p>
                {/if}
              </div>

              {#if otpStatus !== 200}
                <button
                  type="submit"
                  class="w-full bg-gradient-to-r from-primary-400 to-primary-500 hover:from-primary-500 hover:to-primary-600 text-white rounded-md py-2 font-medium transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg flex items-center justify-center"
                  disabled={isLoading}
                >
                  {#if isLoading}
                    <Icon
                      icon="line-md:loading-alt-loop"
                      class="w-5 h-5 mr-2 animate-spin inline"
                    />
                    Sending..
                  {:else}
                    <Icon icon="heroicons:paper-airplane" class="mr-2" />
                    Send OTP
                  {/if}
                </button>
              {/if}

              {#if otpStatus === 200}
                <form
                  action="?/verifyOtp"
                  method="POST"
                  use:enhance={({formData}) => {
                    formData.append('email', email);
                    return async ({ result, update }) => {
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
                            "Verification successful, but no redirect URL provided!"
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
                      Enter the 6-digit OTP sent to your email to complete
                      verification.
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
                          class="pl-10 w-full rounded-md border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-0 focus:ring-primary-500"
                        />
                      </div>
                      <button
                        class="bg-primary-500 text-white text-sm py-2 px-4 rounded-md font-medium hover:bg-primary-600 transition-colors"
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                </form>

                <form
                  action="?/sendOtp"
                  method="POST"
                  use:enhance={({formData}) => {
                    formData.append('email', email);
                    return async ({ result }) => {
                      // console.log(result);
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
                        class="text-sm px-4 py-2 rounded-full bg-gradient-to-r from-primary-100 to-primary-200 text-primary-800 border border-primary-300 flex items-center"
                      >
                        <Icon icon="heroicons:clock" class="mr-2" />
                        Resend in {formatTime(timeLeft)}
                      </span>
                    </div>
                  {:else}
                    <div class="flex justify-center mt-3">
                      <button
                        on:click={handleResendOtp}
                        type="submit"
                        class="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline flex items-center"
                      >
                        <Icon icon="heroicons:arrow-path" class="mr-1" />
                        Resend OTP
                      </button>
                    </div>
                  {/if}
                </form>
              {/if}
            </form>
          {:else}
            <form
              method="POST"
              action="?/login"
              use:enhance={handleFormSubmit}
              class="space-y-4"
            >

              <div class="space-y-1">
                <label
                  for="emailOrUsername"
                  class="block text-sm font-medium text-gray-700"
                >
                  Email 
                </label>
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
                    class="pl-10 w-full rounded-md border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-0 focus:ring-primary-500"
                  />
                </div>
                {#if errors.emailOrUsername}
                  <p class="text-red-500 text-xs mt-1">
                    {errors.emailOrUsername}
                  </p>
                {/if}
              </div>
              <div class="space-y-1">
                <label
                  for="password"
                  class="block text-sm font-medium text-gray-700"
                  >Password</label
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
                      class="pl-10 w-full rounded-md border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-0 focus:ring-primary-500"
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
                      class="pl-10 w-full rounded-md border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-0 focus:ring-primary-500"
                    />
                  {/if}
                  <button
                    type="button"
                    class="absolute top-3 right-2.5 text-gray-500 hover:text-gray-700 focus:outline-none"
                    on:click={() => (showPassword = !showPassword)}
                  >
                    {#if showPassword}
                      <Icon icon="mdi:eye-off-outline" class="w-5 h-5" />
                    {:else}
                      <Icon icon="mdi:eye-outline" class="w-5 h-5" />
                    {/if}
                  </button>
                </div>
                {#if validErrorpass}
                  <p class="text-red-500 text-xs mt-1">{validErrorpass}</p>
                {/if}
              </div>

              <div class="flex justify-end">
                <a
                  href="/admin/forgot"
                  class="md:text-sm text-xs text-primary-600 hover:text-primary-700 hover:underline underline-offset-2"
                  >Forgot password?</a
                >
              </div>

              <button
                type="submit"
                class="w-full bg-gradient-to-r from-primary-400 to-primary-500 hover:from-primary-500 hover:to-primary-600 text-white rounded-md py-2 font-medium transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg flex items-center justify-center"
              >
                <Icon icon="material-symbols:open-in-phone" class="mr-2" />
                Sign In
              </button>
            </form>
          {/if}

          <!-- <div class="relative flex py-5 items-center">
            <div class="flex-grow border-t border-gray-300"></div>
            <span class="flex-shrink mx-4 text-gray-500 text-sm">OR</span>
            <div class="flex-grow border-t border-gray-300"></div>
          </div> -->

          <!-- {#if isOtpLogin}
            <button
              on:click={() => (isOtpLogin = false)}
              class="w-full mb-3 flex items-center justify-center py-2 px-4 text-white bg-primary-500 hover:bg-primary-600 rounded-md transition duration-200 font-medium"
            >
              <Icon icon="heroicons:arrow-left" class="mr-2" />
              <span class="text-sm">Back to Password Login</span>
            </button>
          {:else}
            <button
              on:click={() => (isOtpLogin = true)}
              class="w-full mb-3 flex items-center justify-center py-2 px-4 text-white bg-primary-500 hover:bg-primary-600 rounded-md transition duration-200 font-medium"
            >
              <Icon icon="fluent:mail-12-regular" class="mr-1 text-2xl" />
              <span class="text-sm">Sign In with OTP</span>
            </button>
          {/if} -->
  
        </div>
      </div>
    <!-- </div> -->
  <!-- </div> -->
  <Toaster position="bottom-right" richColors />
</div>