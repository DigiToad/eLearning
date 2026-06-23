<script>
    import { onMount } from "svelte";
    import { enhance, applyAction } from "$app/forms";
    import { toast, Toaster } from "svelte-sonner";
    import Icon from "@iconify/svelte";
    import { goto } from "$app/navigation";
    import { countries, phoneNumberPatterns } from "$lib/data/constants.js";

    // Form fields
    let firstName = "";
    let lastName = "";
    let email = "";
    let country = "";
    let phone = "";
    let institution = "";
    let password = "";
    let passwordConfirm = "";

    // UI state
    let searchTerm = "";
    let filteredCountries = countries;
    let showDropdown = false;
    let highlightedIndex = -1;
    let dropdownEl;
    let passwordVisible = false;
    let confirmPasswordVisible = false;
    let typing = false;
    let passwordStrength = 0;
    let isProcessing = false;
    let showRedirectModal = false;
    let errors = {};

    // ── Email verification state ─────────────────────────────────
    let isEmailVerified = false;
    let isSendingOtp = false;
    let isVerifyingOtp = false;
    let showOtpInput = false;
    let otpValue = "";
    let otpError = "";
    let otpResendTimer = 0;
    let resendInterval = null;

    // ── Parse SvelteKit action response ─────────────────────────
    // SvelteKit serializes action return values as:
    //   { type, status, data: "[{key:index,...}, val0, val1, ...]" }
    // where data[0] is a map of { fieldName: arrayIndex } and the rest are values.
    function parseSvelteKitActionResponse(raw) {
        try {
            // raw.data is a JSON string like: '[{"success":1,"message":2},true,"some message"]'
            const arr = JSON.parse(raw.data);
            if (!Array.isArray(arr) || arr.length < 2) return raw.data ?? raw;
            const keyMap = arr[0]; // e.g. { success: 1, message: 2 }
            const result = {};
            for (const [key, idx] of Object.entries(keyMap)) {
                result[key] = arr[idx];
            }
            return result;
        } catch {
            return raw.data ?? raw;
        }
    }

    // ── Validators ──────────────────────────────────────────────
    function validateFirstName() {
        let e = { ...errors };
        if (!firstName.trim()) {
            e.firstName = "Required";
        } else if (!/^[a-zA-Z\s]+$/.test(firstName)) {
            e.firstName = "Name can only contain letters and spaces";
        } else {
            delete e.firstName;
        }
        errors = e;
    }

    function validateLastName() {
        let e = { ...errors };
        if (!lastName.trim()) {
            e.lastName = "Required";
        } else if (!/^[a-zA-Z\s]+$/.test(lastName)) {
            e.lastName = "Name can only contain letters and spaces";
        } else {
            delete e.lastName;
        }
        errors = e;
    }

    function validateEmail() {
        let e = { ...errors };
        if (!email) {
            e.email = "Required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            e.email = "Please enter a valid email.";
        } else {
            delete e.email;
        }
        errors = e;
    }

    function validateCountry() {
        let e = { ...errors };
        if (!country || country.trim() === "") {
            e.country = "Required";
        } else {
            const match = countries.find(
                (c) => c.name.toLowerCase() === country.toLowerCase(),
            );
            if (!match) {
                e.country = "Invalid country selected";
            } else {
                delete e.country;
            }
        }
        errors = e;
    }

    function getCountryByCode(code) {
        const c = countries.find((c) => c.code === code || c.name === code);
        return c ? c.name : null;
    }

    function getPhonePattern(countryCode) {
        const countryName = getCountryByCode(countryCode);
        if (!countryName) return "^[0-9]+$";
        const regex = phoneNumberPatterns[countryName];
        return regex ? regex.source : "^[0-9]+$";
    }

    function validatePhoneNumber(countryName, phoneVal) {
        let e = { ...errors };
        if (!phoneVal) {
            e.phone = "Required";
        } else if (!countryName) {
            e.phone = "Select a country first";
        } else {
            const matchedCountry = countries.find(
                (c) => c.name === countryName,
            );
            if (!matchedCountry) {
                e.phone = "Invalid country selected";
            } else {
                const phoneRegex = new RegExp(
                    getPhonePattern(matchedCountry.code),
                );
                if (!phoneRegex.test(phoneVal)) {
                    e.phone = `Invalid phone number for ${countryName}.`;
                } else {
                    delete e.phone;
                }
            }
        }
        errors = e;
    }

    function validateInstitution() {
        let e = { ...errors };
        if (!institution.trim()) {
            e.institution = "Required";
        } else {
            delete e.institution;
        }
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
        if (!password) {
            e.password = "Required";
            passwordStrength = 0;
        } else if (password.length < 8) {
            e.password = "At least 8 characters required";
            passwordStrength = calculateStrength(password);
        } else if (password.toLowerCase().includes("password")) {
            e.password = "Cannot contain common words";
            passwordStrength = calculateStrength(password);
        } else if (/[^a-zA-Z0-9!@#$%^&*\-]/.test(password)) {
            e.password = "Only !@#$%^&*- special characters allowed";
            passwordStrength = calculateStrength(password);
        } else if (
            !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*\-])[A-Za-z\d!@#$%^&*\-]{8,}$/.test(
                password,
            )
        ) {
            e.password = "Password doesn't meet all requirements";
            passwordStrength = 50;
        } else {
            delete e.password;
            passwordStrength = calculateStrength(password);
        }
        errors = e;
    }

    function validateConfirmPassword() {
        let e = { ...errors };
        if (!passwordConfirm) {
            e.passwordConfirm = "Required";
        } else if (passwordConfirm !== password) {
            e.passwordConfirm = "Passwords do not match";
        } else {
            delete e.passwordConfirm;
        }
        errors = e;
    }

    function validateForm() {
        errors = {};
        validateFirstName();
        validateLastName();
        validateEmail();
        validateCountry();
        validatePhoneNumber(country, phone);
        validateInstitution();
        validatePassword();
        validateConfirmPassword();
        if (Object.keys(errors).length > 0) {
            toast.error("Please fill all required fields correctly");
            return false;
        }
        return true;
    }

    // ── Country dropdown ─────────────────────────────────────────
    function handleCountryFocus() {
        searchTerm = "";
        filteredCountries = countries;
        showDropdown = true;
        highlightedIndex = -1;
    }
    function handleCountryBlur() {
        setTimeout(() => {
            searchTerm = country ? country : "";
        }, 150);
    }

    function selectCountry(selectedCountry) {
        country = selectedCountry.name;
        searchTerm = selectedCountry.name;
        showDropdown = false;
        highlightedIndex = -1;
        let e = { ...errors };
        delete e.country;
        errors = e;
        if (phone) validatePhoneNumber(selectedCountry.name, phone);
    }

    function filterCountriesWithoutAutoSelect() {
        const startsWith = countries.filter((c) =>
            c.name.toLowerCase().startsWith(searchTerm.toLowerCase()),
        );
        const contains = countries.filter(
            (c) =>
                !c.name.toLowerCase().startsWith(searchTerm.toLowerCase()) &&
                c.name.toLowerCase().includes(searchTerm.toLowerCase()),
        );
        filteredCountries = [...startsWith, ...contains];
        countries
            .filter((c) =>
                c.code
                    .replace("+", "")
                    .includes(searchTerm.replace("+", "").toLowerCase()),
            )
            .forEach((c) => {
                if (!filteredCountries.some((f) => f.name === c.name))
                    filteredCountries.push(c);
            });
    }

    function handleInputChange(event) {
        searchTerm = event.target.value;
        country = event.target.value;
        filterCountriesWithoutAutoSelect();
        showDropdown = true;
        const match = countries.find(
            (c) => c.name.toLowerCase() === searchTerm.toLowerCase(),
        );
        let e = { ...errors };
        if (match) {
            delete e.country;
        } else if (searchTerm.trim().length > 0) {
            e.country = "Invalid country selected";
        } else {
            delete e.country;
        }
        errors = e;
        const alreadyExact = countries.some(
            (c) => c.name.toLowerCase() === searchTerm.toLowerCase(),
        );
        if (searchTerm.length > 0 && !alreadyExact) {
            const startsWithList = filteredCountries.filter((c) =>
                c.name.toLowerCase().startsWith(searchTerm.toLowerCase()),
            );
            if (startsWithList.length === 1) selectCountry(startsWithList[0]);
        }
    }

    function handleKeyDown(event) {
        if (!showDropdown) return;
        if (event.key === "ArrowDown") {
            event.preventDefault();
            highlightedIndex =
                (highlightedIndex + 1) % filteredCountries.length;
            scrollToHighlighted();
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            highlightedIndex =
                highlightedIndex <= 0
                    ? filteredCountries.length - 1
                    : highlightedIndex - 1;
            scrollToHighlighted();
        } else if (event.key === "Enter") {
            if (highlightedIndex >= 0)
                selectCountry(filteredCountries[highlightedIndex]);
            else if (filteredCountries.length > 0)
                selectCountry(filteredCountries[0]);
            event.preventDefault();
        } else if (event.key === "Escape") {
            showDropdown = false;
            highlightedIndex = -1;
        }
    }

    function scrollToHighlighted() {
        if (!dropdownEl) return;
        const items = dropdownEl.querySelectorAll("li");
        if (items[highlightedIndex])
            items[highlightedIndex].scrollIntoView({ block: "nearest" });
    }

    function handleClickOutside(event) {
        if (!event.target.closest(".dropdown-container")) showDropdown = false;
    }

    onMount(() => {
        document.addEventListener("click", handleClickOutside);
        return () => {
            document.removeEventListener("click", handleClickOutside);
            if (resendInterval) clearInterval(resendInterval);
        };
    });

    // ── Password toggles ─────────────────────────────────────────
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

    // ── Email OTP logic ──────────────────────────────────────────
    function startResendTimer() {
        otpResendTimer = 60;
        if (resendInterval) clearInterval(resendInterval);
        resendInterval = setInterval(() => {
            otpResendTimer -= 1;
            if (otpResendTimer <= 0) {
                otpResendTimer = 0;
                clearInterval(resendInterval);
            }
        }, 1000);
    }

    async function handleSendOtp() {
        validateEmail();
        if (errors.email || !email) return;

        isSendingOtp = true;
        try {
            const res = await fetch("?/sendotp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({ email }),
            });

            const raw = await res.json();
            console.log("sendotp raw response:", raw);

            // ✅ Decode SvelteKit's array-indexed serialization format
            const result = parseSvelteKitActionResponse(raw);
            console.log("sendotp parsed result:", result);

            if (result?.success) {
                showOtpInput = true;
                otpValue = "";
                otpError = "";
                startResendTimer();
                toast.success("OTP sent to your email!");
            } else if (result?.message === "This email is already verified.") {
            // ✅ Email already verified — reflect that in the UI
            isEmailVerified = true;
            showOtpInput = false;
            toast.success("This email is already verified!");
        }
            
            else {
                toast.error(
                    result?.message || "Failed to send OTP. Try again.",
                );
            }
        } catch (err) {
            console.error("sendotp fetch error:", err);
            toast.error("Network error. Please try again.");
        } finally {
            isSendingOtp = false;
        }
    }

    async function handleVerifyOtp() {
        if (!otpValue || otpValue.length !== 6) {
            otpError = "Enter the 6-digit OTP";
            return;
        }
        isVerifyingOtp = true;
        otpError = "";
        try {
            const res = await fetch("?/verifyemail", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({ email, otp: otpValue }),
            });

            const raw = await res.json();
            console.log("verifyemail raw response:", raw);

            // ✅ Decode SvelteKit's array-indexed serialization format
            const result = parseSvelteKitActionResponse(raw);
            console.log("verifyemail parsed result:", result);

            if (result?.success) {
                isEmailVerified = true;
                showOtpInput = false;
                if (resendInterval) clearInterval(resendInterval);
                toast.success("Email verified successfully!");
            } else {
                otpError = result?.message || "Invalid OTP. Please try again.";
            }
        } catch (err) {
            console.error("verifyemail fetch error:", err);
            otpError = "Network error. Please try again.";
        } finally {
            isVerifyingOtp = false;
        }
    }

    function handleEmailInput() {
        if (isEmailVerified || showOtpInput) {
            isEmailVerified = false;
            showOtpInput = false;
            otpValue = "";
            otpError = "";
            if (resendInterval) clearInterval(resendInterval);
            otpResendTimer = 0;
        }
        validateEmail();
    }

    // ── Form submit ───────────────────────────────────────────────
    async function handleFormSubmission({ cancel, formData }) {
        if (!isEmailVerified) {
            toast.error("Please verify your email to proceed");
            cancel();
            return;
        }
        if (!validateForm()) {
            cancel();
            return;
        }
        isProcessing = true;
        formData.append("role", "user");
        return async ({ result, update }) => {
            isProcessing = false;
            if (result.type === "redirect") {
                await applyAction(result);
            }
            if (result.type === "success") {
                if (result.data.success) {
                    await update();
                    toast.success(result.data.message);
                    await goto("/dashboard");
                    location.reload();
                } else {
                    const errorText = result.data.message;
                    if (
                        errorText ===
                        "This email already exists. Please login or try with another."
                    ) {
                        showRedirectModal = true;
                    } else {
                        toast.error(errorText);
                    }
                }
            }
        };
    }

    function handleRedirectConfirm() {
        showRedirectModal = false;
        goto("/login");
    }
    function handleRedirectCancel() {
        showRedirectModal = false;
    }
</script>

<!-- h-screen + overflow-hidden = left panel never moves -->
 <div class="min-h-screen bg-gradient-to-br from-gray-100 via-primary-50 to-primary-200 flex items-center justify-center p-4">

  <!-- CARD: left + right panels -->
  <div class="w-full  max-w-6xl  max-h-[600px] flex flex-col md:flex-row shadow-2xl rounded-2xl overflow-hidden">
<!-- <div class="h-screen     shadow-2xl rounded-2xl bg-gradient-to-br from-gray-100 via-primary-50 to-primary-200 flex overflow-hidden pl-10"> -->
    <!-- ───── LEFT PANEL (sticky, never scrolls) ───── -->
    <div
        class="hidden  md:flex  md:w-2/5  bg-primary-500 flex-col justify-between p-5 relative overflow-hidden flex-shrink-0"
    >
             <div class="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/5 pointer-events-none"></div>
      <div class="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none"></div>
        <div class="relative z-">
            <!-- <div class="flex items-center gap-3 mb-12"> -->
                <!-- <div
                    class="w-9 h-9 rounded-lg bg-primary-500 flex items-center justify-center"
                >
                    <Icon
                        icon="fluent:hat-graduation-12-filled"
                        class="text-white text-lg"
                    />
                </div>
                <span
                    class="text-white font-roboto font-bold text-xl tracking-tight"
                    >SkillsBlock</span
                > -->
            <!-- </div> -->
            <h1 class="text-white text-3xl font-bold leading-snug mb-4">
                Start your<br />learning journey<br />today.
            </h1>
            <p class="text-primary-300 text-sm leading-relaxed font-light">
                Join thousands of students accessing world-class courses from
                top institutions.
            </p>
              <div class="relative z-10 mt-4 space-y-4">
            {#each [{ icon: "mdi:book-open-page-variant-outline", text: "Access 500+ curated courses" }, { icon: "mdi:certificate-outline", text: "Earn verified certificates" }, { icon: "mdi:account-group-outline", text: "Learn from expert instructors" }, { icon: "mdi:clock-outline", text: "Study at your own pace" }] as item}
                <div class="flex items-center gap-3">
                    <div
                        class="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0"
                    >
                        <Icon
                            icon={item.icon}
                            class="text-primary-800 text-base"
                        />
                    </div>
                    <span class="text-primary-200 text-sm">{item.text}</span>
                </div>
            {/each}
        </div>
        </div>

      

     
    </div>

    <!-- ───── RIGHT PANEL (only this scrolls) ───── -->
    <!-- <div class="flex-1  bg-white overflow-y-auto py-10 px-4 md:px-4"> -->
    <div class="  flex-1 w-full bg-white flex  p-8 md:p-12 overflow-y-auto">
        <div class="w-full max-w-[480px]  ml-10">
            <div class="flex items-center gap-2.5 mb-8 lg:hidden">
                <div
                    class="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center"
                >
                    <Icon
                        icon="fluent:hat-graduation-12-filled"
                        class="text-white text-base"
                    />
                </div>
                <span class="text-heading font-roboto font-bold text-lg"
                    >Learnify LMS</span
                >
            </div>

            <div class="mb-8">
                
                <h2
                    class="text-heading text-primary-500 text-2xl font-bold  leading-tight"
                >
                    Create your account
                </h2>
                <p class="text-description text-sm mt-1.5">
                    Already have an account?
                    <a
                        href="/login"
                        class="text-primary-500 font-semibold hover:text-primary-900 hover:underline transition-colors"
                        >Sign in</a
                    >
                </p>
            </div>

            <form
                method="POST"
                action="?/register"
                use:enhance={handleFormSubmission}
                class="space-y-6"
            >
                <input type="hidden" name="role" value="user" />
                <input type="hidden" name="email" value={email} />
                <input
                    type="hidden"
                    name="isEmailVerified"
                    value={isEmailVerified}
                />
                <!-- SECTION: Personal Info -->
                <div>
                    <div class="flex items-center gap-2 mb-4">
                        <div
                            class="w-5 h-5 rounded bg-primary-50 flex items-center justify-center flex-shrink-0"
                        >
                            <Icon
                                icon="mdi:account-outline"
                                class="text-primary-600 text-xs"
                            />
                        </div>
                        <span
                            class="text-xs font-bold tracking-widest uppercase text-description"
                            >Personal Info</span
                        >
                        <div class="flex-1 h-px bg-gray-200"></div>
                    </div>

                    <div class="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <label
                                for="firstName"
                                class="block text-xs font-semibold text-description mb-1.5"
                            >
                                First Name <span class="text-primary-500"
                                    >*</span
                                >
                            </label>
                            <div class="relative">
                                <input
                                    id="firstName"
                                    type="text"
                                    name="firstName"
                                    maxlength="50"
                                    bind:value={firstName}
                                    placeholder="First name"
                                    on:input={(e) => {
                                        firstName = e.target.value.trimStart();
                                        validateFirstName();
                                    }}
                                    class="w-full h-10 px-3 pr-10 rounded-lg border text-sm text-heading placeholder-gray-300 bg-white outline-none transition-all duration-150
                    {errors.firstName
                                        ? 'border-red-400 ring-2 ring-red-100'
                                        : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}"
                                />
                                <Icon
                                    icon="mdi:account-outline"
                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-base pointer-events-none"
                                />
                            </div>
                            {#if errors.firstName}
                                <p
                                    class="text-red-500 text-xs font-medium mt-1 flex items-center gap-1"
                                >
                                    <Icon
                                        icon="mdi:alert-circle-outline"
                                        class="text-xs flex-shrink-0"
                                    />{errors.firstName}
                                </p>
                            {/if}
                        </div>

                        <div>
                            <label
                                for="lastName"
                                class="block text-xs font-semibold text-description mb-1.5"
                            >
                                Last Name <span class="text-primary-500">*</span
                                >
                            </label>
                            <div class="relative">
                                <input
                                    id="lastName"
                                    type="text"
                                    name="lastName"
                                    maxlength="50"
                                    bind:value={lastName}
                                    placeholder="Last name"
                                    on:input={(e) => {
                                        lastName = e.target.value.trimStart();
                                        validateLastName();
                                    }}
                                    class="w-full h-10 px-3 pr-10 rounded-lg border text-sm text-heading placeholder-gray-300 bg-white outline-none transition-all duration-150
                    {errors.lastName
                                        ? 'border-red-400 ring-2 ring-red-100'
                                        : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}"
                                />
                                <Icon
                                    icon="mdi:account-outline"
                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-base pointer-events-none"
                                />
                            </div>
                            {#if errors.lastName}
                                <p
                                    class="text-red-500 text-xs font-medium mt-1 flex items-center gap-1"
                                >
                                    <Icon
                                        icon="mdi:alert-circle-outline"
                                        class="text-xs flex-shrink-0"
                                    />{errors.lastName}
                                </p>
                            {/if}
                        </div>
                    </div>

                    <!-- ── Email with Verify button ── -->
                    <div>
                        <label
                            for="email"
                            class="block text-xs font-semibold text-description mb-1.5"
                        >
                            Email Address <span class="text-primary-500">*</span
                            >
                        </label>

                        <div class="flex gap-2 items-start">
                            <div class="relative flex-1">
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    maxlength="100"
                                    bind:value={email}
                                    on:input={handleEmailInput}
                                    placeholder="you@university.edu"
                                    disabled={isEmailVerified}
                                    class="w-full h-10 pl-3 pr-10 rounded-lg border text-sm text-heading placeholder-gray-300 bg-white outline-none transition-all duration-150
                    {isEmailVerified
                                        ? 'border-green-400 bg-green-50 text-green-700 cursor-not-allowed'
                                        : errors.email
                                          ? 'border-red-400 ring-2 ring-red-100'
                                          : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}"
                                />
                                {#if isEmailVerified}
                                    <Icon
                                        icon="mdi:check-circle"
                                        class="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-base pointer-events-none"
                                    />
                                {:else}
                                    <Icon
                                        icon="mdi:email-outline"
                                        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-base pointer-events-none"
                                    />
                                {/if}
                            </div>

                            {#if isEmailVerified}
                                <div
                                    class="h-10 px-3 flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-300 text-green-700 text-xs font-semibold flex-shrink-0"
                                >
                                    <Icon
                                        icon="mdi:check-circle-outline"
                                        class="text-sm"
                                    />
                                    Verified
                                </div>
                            {:else if !showOtpInput}
                                <button
                                    type="button"
                                    on:click={handleSendOtp}
                                    disabled={isSendingOtp ||
                                        !email ||
                                        !!errors.email}
                                    class="h-10 px-3.5 rounded-lg text-xs font-bold text-white bg-primary-500 hover:bg-primary-600 active:bg-primary-700
                    transition-all duration-150 flex items-center gap-1.5 flex-shrink-0
                    disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {#if isSendingOtp}
                                        <Icon
                                            icon="line-md:loading-alt-loop"
                                            class="text-sm"
                                        />
                                        Sending…
                                    {:else}
                                        <Icon
                                            icon="mdi:email-check-outline"
                                            class="text-sm"
                                        />
                                        Verify Email
                                    {/if}
                                </button>
                            {:else}
                                <button
                                    type="button"
                                    on:click={handleSendOtp}
                                    disabled={isSendingOtp ||
                                        otpResendTimer > 0}
                                    class="h-10 px-3 rounded-lg text-xs font-semibold text-primary-600 border border-primary-200 bg-primary-50 hover:bg-primary-100
                    transition-all duration-150 flex items-center gap-1 flex-shrink-0
                    disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    {#if isSendingOtp}
                                        <Icon
                                            icon="line-md:loading-alt-loop"
                                            class="text-sm"
                                        />
                                    {:else if otpResendTimer > 0}
                                        {otpResendTimer}s
                                    {:else}
                                        <Icon
                                            icon="mdi:refresh"
                                            class="text-sm"
                                        />
                                        Resend
                                    {/if}
                                </button>
                            {/if}
                        </div>

                        {#if errors.email}
                            <p
                                class="text-red-500 text-xs font-medium mt-1 flex items-center gap-1"
                            >
                                <Icon
                                    icon="mdi:alert-circle-outline"
                                    class="text-xs flex-shrink-0"
                                />{errors.email}
                            </p>
                        {/if}

                        <!-- OTP input panel -->
                        {#if showOtpInput && !isEmailVerified}
                            <div
                                class="mt-3 p-3.5 rounded-xl border border-primary-100 bg-primary-50/60"
                            >
                                <p
                                    class="text-xs text-primary-700 font-medium mb-2.5 flex items-center gap-1.5"
                                >
                                    <Icon
                                        icon="mdi:shield-key-outline"
                                        class="text-sm flex-shrink-0"
                                    />
                                    Enter the 6-digit OTP sent to
                                    <span
                                        class="font-bold truncate max-w-[180px]"
                                        >{email}</span
                                    >
                                </p>
                                <div class="flex gap-2">
                                    <input
                                        type="text"
                                        inputmode="numeric"
                                        maxlength="6"
                                        bind:value={otpValue}
                                        placeholder="••••••"
                                        on:input={() => {
                                            otpError = "";
                                            if (otpValue.length === 6)
                                                handleVerifyOtp();
                                        }}
                                        class="flex-1 h-10 px-3 rounded-lg border text-sm text-heading placeholder-gray-300 bg-white outline-none tracking-[0.25em] font-mono text-center transition-all duration-150
                      {otpError
                                            ? 'border-red-400 ring-2 ring-red-100'
                                            : 'border-primary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}"
                                    />
                                    <button
                                        type="button"
                                        on:click={handleVerifyOtp}
                                        disabled={isVerifyingOtp || !otpValue}
                                        class="h-10 px-4 rounded-lg text-xs font-bold text-white bg-primary-500 hover:bg-primary-600
                      transition-all duration-150 flex items-center gap-1.5 flex-shrink-0
                      disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {#if isVerifyingOtp}
                                            <Icon
                                                icon="line-md:loading-alt-loop"
                                                class="text-sm"
                                            />
                                        {:else}
                                            <Icon
                                                icon="mdi:shield-check-outline"
                                                class="text-sm"
                                            />
                                            Verify OTP
                                        {/if}
                                    </button>
                                </div>
                                {#if otpError}
                                    <p
                                        class="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1"
                                    >
                                        <Icon
                                            icon="mdi:alert-circle-outline"
                                            class="text-xs flex-shrink-0"
                                        />{otpError}
                                    </p>
                                {/if}
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- SECTION: Location & Contact -->
                <div>
                    <div class="flex items-center gap-2 mb-4">
                        <div
                            class="w-5 h-5 rounded bg-primary-50 flex items-center justify-center flex-shrink-0"
                        >
                            <Icon
                                icon="mdi:map-marker-outline"
                                class="text-primary-600 text-xs"
                            />
                        </div>
                        <span
                            class="text-xs font-bold tracking-widest uppercase text-description"
                            >Location & Contact</span
                        >
                        <div class="flex-1 h-px bg-gray-200"></div>
                    </div>

                    <div class="dropdown-container relative mb-4">
                        <label
                            for="countryInput"
                            class="block text-xs font-semibold text-description mb-1.5"
                        >
                            Country <span class="text-primary-500">*</span>
                        </label>
                        <div class="relative">
                            <input
                                id="countryInput"
                                type="text"
                                name="country"
                                autocomplete="off"
                                bind:value={searchTerm}
                                on:input={handleInputChange}
                                on:keydown={handleKeyDown}
                                on:focus={handleCountryFocus}
                                on:blur={handleCountryBlur}
                                placeholder="Search country..."
                                class="w-full h-10 pl-3 pr-10 rounded-lg border text-sm text-heading placeholder-gray-300 bg-white outline-none transition-all duration-150
                  {errors.country
                                    ? 'border-red-400 ring-2 ring-red-100'
                                    : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}"
                            />
                            <Icon
                                icon="mdi:chevron-down"
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-base pointer-events-none"
                            />
                        </div>
                        {#if errors.country}
                            <p
                                class="text-red-500 text-xs font-medium mt-1 flex items-center gap-1"
                            >
                                <Icon
                                    icon="mdi:alert-circle-outline"
                                    class="text-xs flex-shrink-0"
                                />{errors.country}
                            </p>
                        {/if}
                        {#if showDropdown && filteredCountries.length > 0}
                            <ul
                                bind:this={dropdownEl}
                                class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto"
                            >
                                {#each filteredCountries as c, i}
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                                    <li
                                        class="px-3.5 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-colors
                      {i === highlightedIndex
                                            ? 'bg-primary-50 text-primary-700'
                                            : 'text-heading hover:bg-gray-50'}"
                                        on:click={() => selectCountry(c)}
                                        on:mouseenter={() =>
                                            (highlightedIndex = i)}
                                    >
                                        <span>{c.name}</span>
                                        <span
                                            class="text-xs text-gray-400 font-mono"
                                            >{c.code}</span
                                        >
                                    </li>
                                {/each}
                            </ul>
                        {/if}
                    </div>

                    <div>
                        <label
                            for="phone"
                            class="block text-xs font-semibold text-description mb-1.5"
                        >
                            Phone Number <span class="text-primary-500">*</span>
                        </label>
                        <div class="relative">
                            <input
                                id="phone"
                                type="tel"
                                name="phone"
                                maxlength="15"
                                bind:value={phone}
                                on:input={() =>
                                    validatePhoneNumber(country, phone)}
                                placeholder="Enter your phone number"
                                class="w-full h-10 pl-3 pr-10 rounded-lg border text-sm text-heading placeholder-gray-300 bg-white outline-none transition-all duration-150
                  {errors.phone
                                    ? 'border-red-400 ring-2 ring-red-100'
                                    : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}"
                            />
                            <Icon
                                icon="mdi:phone-outline"
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-base pointer-events-none"
                            />
                        </div>
                        {#if errors.phone}
                            <p
                                class="text-red-500 text-xs font-medium mt-1 flex items-center gap-1"
                            >
                                <Icon
                                    icon="mdi:alert-circle-outline"
                                    class="text-xs flex-shrink-0"
                                />{errors.phone}
                            </p>
                        {/if}
                    </div>
                </div>

                <!-- SECTION: Academic Details -->
                <div>
                    <div class="flex items-center gap-2 mb-4">
                        <div
                            class="w-5 h-5 rounded bg-primary-50 flex items-center justify-center flex-shrink-0"
                        >
                            <Icon
                                icon="mdi:school-outline"
                                class="text-primary-600 text-xs"
                            />
                        </div>
                        <span
                            class="text-xs font-bold tracking-widest uppercase text-description"
                            >Academic Details</span
                        >
                        <div class="flex-1 h-px bg-gray-200"></div>
                    </div>

                    <div>
                        <label
                            for="institution"
                            class="block text-xs font-semibold text-description mb-1.5"
                        >
                            Institution <span class="text-primary-500">*</span>
                        </label>
                        <div class="relative">
                            <input
                                id="institution"
                                type="text"
                                name="institution"
                                maxlength="150"
                                bind:value={institution}
                                on:input={validateInstitution}
                                placeholder="e.g. University of Delhi"
                                class="w-full h-10 pl-3 pr-10 rounded-lg border text-sm text-heading placeholder-gray-300 bg-white outline-none transition-all duration-150
                  {errors.institution
                                    ? 'border-red-400 ring-2 ring-red-100'
                                    : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}"
                            />
                            <Icon
                                icon="mdi:office-building-outline"
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-base pointer-events-none"
                            />
                        </div>
                        {#if errors.institution}
                            <p
                                class="text-red-500 text-xs font-medium mt-1 flex items-center gap-1"
                            >
                                <Icon
                                    icon="mdi:alert-circle-outline"
                                    class="text-xs flex-shrink-0"
                                />{errors.institution}
                            </p>
                        {/if}
                    </div>
                </div>

                <!-- SECTION: Security -->
                <div>
                    <div class="flex items-center gap-2 mb-4">
                        <div
                            class="w-5 h-5 rounded bg-primary-50 flex items-center justify-center flex-shrink-0"
                        >
                            <Icon
                                icon="mdi:lock-outline"
                                class="text-primary-600 text-xs"
                            />
                        </div>
                        <span
                            class="text-xs font-bold tracking-widest uppercase text-description"
                            >Security</span
                        >
                        <div class="flex-1 h-px bg-gray-200"></div>
                    </div>

                    <div class="mb-4">
                        <label
                            for="password"
                            class="block text-xs font-semibold text-description mb-1.5"
                        >
                            Password <span class="text-primary-500">*</span>
                        </label>
                        <div class="relative">
                            <input
                                id="password"
                                name="password"
                                type="password"
                                maxlength="50"
                                bind:value={password}
                                on:input={(e) => {
                                    password = e.target.value.trim();
                                    validatePassword();
                                }}
                                placeholder="Create a strong password"
                                class="w-full h-10 px-3 pr-10 rounded-lg border text-sm text-heading placeholder-gray-300 bg-white outline-none transition-all duration-150
                  {errors.password
                                    ? 'border-red-400 ring-2 ring-red-100'
                                    : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}"
                            />
                            <button
                                type="button"
                                on:click={togglePasswordVisibility}
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                                aria-label={passwordVisible
                                    ? "Hide password"
                                    : "Show password"}
                            >
                                <Icon
                                    icon={passwordVisible
                                        ? "mdi:eye-off-outline"
                                        : "mdi:eye-outline"}
                                    class="w-[17px] h-[17px]"
                                />
                            </button>
                        </div>
                        {#if errors.password}
                            <p
                                class="text-red-500 text-xs font-medium mt-1 flex items-center gap-1"
                            >
                                <Icon
                                    icon="mdi:alert-circle-outline"
                                    class="text-xs flex-shrink-0"
                                />{errors.password}
                            </p>
                        {/if}
                    </div>

                    {#if typing}
                        <div
                            class="mb-4 bg-gray-50 rounded-xl border border-gray-100 px-4 py-3"
                        >
                            <div class="grid grid-cols-2 gap-y-2 gap-x-4 mb-3">
                                {#each [{ label: "No common words", pass: !password
                                            .toLowerCase()
                                            .includes("password") }, { label: "8+ characters", pass: password.length >= 8 }, { label: "Uppercase & numbers", pass: /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) }, { label: "Special character", pass: /[!@#$%^&*\-]/.test(password) }] as rule}
                                    <div
                                        class="flex items-center gap-1.5 text-xs font-medium {rule.pass
                                            ? 'text-primary-600'
                                            : 'text-gray-400'}"
                                    >
                                        <Icon
                                            icon={rule.pass
                                                ? "lets-icons:check-fill"
                                                : "lets-icons:close-ring-duotone"}
                                            class="w-3.5 h-3.5 flex-shrink-0"
                                        />
                                        {rule.label}
                                    </div>
                                {/each}
                            </div>
                            <div class="flex gap-1 mb-1.5">
                                {#each [25, 50, 75, 100] as seg}
                                    <div
                                        class="flex-1 h-1.5 rounded-full transition-all duration-300
                    {passwordStrength >= seg
                                            ? passwordStrength <= 50
                                                ? 'bg-red-400'
                                                : passwordStrength <= 75
                                                  ? 'bg-yellow-400'
                                                  : 'bg-primary-500'
                                            : 'bg-gray-200'}"
                                    ></div>
                                {/each}
                            </div>
                            <p
                                class="text-xs font-semibold {passwordStrength <=
                                50
                                    ? 'text-red-500'
                                    : passwordStrength <= 75
                                      ? 'text-yellow-600'
                                      : 'text-primary-600'}"
                            >
                                {passwordStrength <= 25
                                    ? "Very Weak"
                                    : passwordStrength <= 50
                                      ? "Weak"
                                      : passwordStrength <= 75
                                        ? "Moderate"
                                        : "Strong"}
                            </p>
                        </div>
                    {/if}

                    <div>
                        <label
                            for="passwordConfirm"
                            class="block text-xs font-semibold text-description mb-1.5"
                        >
                            Confirm Password <span class="text-primary-500"
                                >*</span
                            >
                        </label>
                        <div class="relative">
                            <input
                                id="passwordConfirm"
                                name="confirmpassword"
                                type="password"
                                maxlength="50"
                                bind:value={passwordConfirm}
                                on:input={(e) => {
                                    passwordConfirm = e.target.value.trim();
                                    validateConfirmPassword();
                                }}
                                placeholder="Repeat your password"
                                class="w-full h-10 px-3 pr-10 rounded-lg border text-sm text-heading placeholder-gray-300 bg-white outline-none transition-all duration-150
                  {errors.passwordConfirm
                                    ? 'border-red-400 ring-2 ring-red-100'
                                    : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}"
                            />
                            <button
                                type="button"
                                on:click={toggleConfirmPasswordVisibility}
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                                aria-label={confirmPasswordVisible
                                    ? "Hide confirm password"
                                    : "Show confirm password"}
                            >
                                <Icon
                                    icon={confirmPasswordVisible
                                        ? "mdi:eye-off-outline"
                                        : "mdi:eye-outline"}
                                    class="w-[17px] h-[17px]"
                                />
                            </button>
                        </div>
                        {#if errors.passwordConfirm}
                            <p
                                class="text-red-500 text-xs font-medium mt-1 flex items-center gap-1"
                            >
                                <Icon
                                    icon="mdi:alert-circle-outline"
                                    class="text-xs flex-shrink-0"
                                />{errors.passwordConfirm}
                            </p>
                        {/if}
                    </div>
                </div>

                <!-- Submit -->
                <button
                    type="submit"
                    class="w-full h-11 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2
    transition-all duration-200 shadow-sm
    {isEmailVerified
                        ? 'bg-primary-500 hover:bg-primary-600 active:bg-primary-700 hover:shadow-md hover:-translate-y-px'
                        : 'bg-gray-300 cursor-not-allowed'}
    disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
                    disabled={isProcessing || !isEmailVerified}
                    on:click={() => {
                        if (!isEmailVerified) {
                            toast.error("Please verify your email to proceed");
                        }
                    }}
                >
                    {#if isProcessing}
                        <Icon icon="line-md:loading-alt-loop" class="text-lg" />
                        Setting up your account...
                    {:else if !isEmailVerified}
                        <Icon icon="mdi:email-lock" class="text-lg" />
                        Verify Email to Continue
                    {:else}
                        <Icon
                            icon="fluent:inprivate-account-28-filled"
                            class="text-lg"
                        />
                        Create Account
                    {/if}
                </button>

                {#if !isEmailVerified}
                    <p
                        class="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2 -mt-2"
                    >
                        <Icon
                            icon="mdi:information-outline"
                            class="text-sm flex-shrink-0"
                        />
                        You must verify your email before creating an account.
                    </p>
                {/if}

                <p
                    class="text-xs text-gray-400 text-center mt-4 leading-relaxed"
                >
                    By registering, you agree to our
                    <a href="/terms" class="text-primary-600 hover:underline"
                        >Terms of Service</a
                    >
                    and
                    <a href="/privacy" class="text-primary-600 hover:underline"
                        >Privacy Policy</a
                    >
                </p>
            </form>
        </div>
    </div>
</div>
</div>

<Toaster position="bottom-right" richColors />

{#if showRedirectModal}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4"
        on:click={handleRedirectCancel}
    >
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
            class="bg-white rounded-2xl p-7 max-w-[360px] w-full shadow-2xl"
            on:click|stopPropagation
        >
            <div
                class="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center mb-4"
            >
                <Icon
                    icon="mdi:email-alert-outline"
                    class="text-primary-600 text-xl"
                />
            </div>
            <h2 class="text-heading text-base font-bold font-roboto mb-1.5">
                Email Already Registered
            </h2>
            <p class="text-description text-sm leading-relaxed mb-6">
                This email already has an account. Would you like to sign in
                instead?
            </p>
            <div class="flex gap-3 justify-end">
                <button
                    on:click={handleRedirectCancel}
                    class="px-5 py-2.5 text-sm font-medium text-description border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    on:click={handleRedirectConfirm}
                    class="px-5 py-2.5 text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                >
                    Go to Login
                </button>
            </div>
        </div>
    </div>
{/if}
