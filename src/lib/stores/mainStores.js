//Main Stores . js
import { writable } from 'svelte/store';

// Global page loading
export const isPageLoading = writable(false);
export const authedUser = writable(null);