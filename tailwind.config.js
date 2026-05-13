/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],

	theme: {
		extend: {
			fontFamily: {
				'noto-sans': ['Noto Sans', 'sans-serif'],
				roboto: ['Roboto', 'sans-serif']
			},

			fontSize: {
				'1s': '9px',
				'2s': '10px',
				md: '16px',
				'12xl': '12rem'
			},

			borderWidth: {
				'1': '1.5px'
			},

			colors: {
				heading: '#1E3A8A',
				description: '#4B5563',

				primary: {
					50: '#EFF6FF',
					100: '#DBEAFE',
					200: '#BFDBFE',
					300: '#93C5FD',
					400: '#60A5FA',
					500: '#3B82F6',
					600: '#2563EB',
					700: '#1D4ED8',
					800: '#1E40AF',
					900: '#1E3A8A',
					950: '#172554'
				},

				secondary: {
					50: '#FFF7ED',
					100: '#FFEDD5',
					200: '#FED7AA',
					300: '#FDBA74',
					400: '#FB923C',
					500: '#F97316',
					600: '#EA580C',
					700: '#C2410C',
					800: '#9A3412',
					900: '#7C2D12',
					950: '#431407'
				}
			},

			animation: {
				loadingbar: 'loadingbar 1s ease-out infinite',
				'spin-slow': 'spin 3s linear infinite',
				'slow-bounce': 'bounce 4s infinite'
			},

			keyframes: {
				loadingbar: {
					'0%': {
						width: '20%',
						transform: 'translateX(20%)'
					},
					'20%': {
						width: '30%',
						transform: 'translateX(30%)'
					},
					'40%': {
						width: '60%',
						transform: 'translateX(30%)'
					},
					'60%': {
						width: '70%',
						transform: 'translateX(40%)'
					},
					'80%': {
						width: '80%',
						transform: 'translateX(40%)'
					},
					'100%': {
						width: '100%',
						transform: 'translateX(60%)'
					}
				}
			}
		}
	},

	plugins: [require('@tailwindcss/forms')]
};