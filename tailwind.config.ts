import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '1rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		fontFamily: {
  			sans: [
  				'Work Sans',
  				'ui-sans-serif',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'Helvetica Neue',
  				'Arial',
  				'Noto Sans',
  				'sans-serif'
  			],
  			serif: [
  				'Lora',
  				'ui-serif',
  				'Georgia',
  				'Cambria',
  				'Times New Roman',
  				'Times',
  				'serif'
  			],
  			mono: [
  				'Inconsolata',
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'Liberation Mono',
  				'Courier New',
  				'monospace'
  			]
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			'neon-purple': 'hsl(var(--neon-purple))',
  			'neon-cyan': 'hsl(var(--neon-cyan))',
  			'neon-red': 'hsl(var(--neon-red))',
  			'glass-border': 'hsl(var(--glass-border))',
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'pulse-neon': {
  				'0%, 100%': {
  					opacity: '1'
  				},
  				'50%': {
  					opacity: '0.4'
  				}
  			},
  			'slide-up': {
  				'0%': {
  					transform: 'translateY(100%)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateY(0)',
  					opacity: '1'
  				}
  			},
  			'slide-down-out': {
  				'0%': {
  					transform: 'translateY(0)',
  					opacity: '1'
  				},
  				'100%': {
  					transform: 'translateY(100%)',
  					opacity: '0'
  				}
  			},
  			'float': {
  				'0%, 100%': {
  					transform: 'translateY(0)'
  				},
  				'50%': {
  					transform: 'translateY(-6px)'
  				}
  			},
  			'shimmer': {
  				'0%': {
  					backgroundPosition: '-200% 0'
  				},
  				'100%': {
  					backgroundPosition: '200% 0'
  				}
  			},
  			'count-up': {
  				'0%': {
  					transform: 'scale(1)'
  				},
  				'50%': {
  					transform: 'scale(1.3)'
  				},
  				'100%': {
  					transform: 'scale(1)'
  				}
  			},
  			'glow-pulse': {
  				'0%, 100%': {
  					boxShadow: '0 0 20px hsl(var(--neon-purple) / 0.2), 0 0 40px hsl(var(--neon-cyan) / 0.05)'
  				},
  				'50%': {
  					boxShadow: '0 0 30px hsl(var(--neon-purple) / 0.4), 0 0 60px hsl(var(--neon-cyan) / 0.15)'
  				}
  			},
  			'marquee': {
  				'0%': {
  					transform: 'translateX(0)'
  				},
  				'100%': {
  					transform: 'translateX(-50%)'
  				}
  			},
  			'marquee-reverse': {
  				'0%': {
  					transform: 'translateX(-50%)'
  				},
  				'100%': {
  					transform: 'translateX(0)'
  				}
  			},
  			'score-float': {
  				'0%': {
  					transform: 'scale(0.5) translateY(20px)',
  					opacity: '0'
  				},
  				'20%': {
  					transform: 'scale(1.2) translateY(-10px)',
  					opacity: '1'
  				},
  				'40%': {
  					transform: 'scale(1) translateY(-30px)',
  					opacity: '1'
  				},
  				'100%': {
  					transform: 'scale(0.8) translateY(-80px)',
  					opacity: '0'
  				}
  			},
  			'rank-up': {
  				'0%': {
  					backgroundColor: 'hsl(142 71% 45% / 0)',
  					transform: 'scale(1) translateY(0)'
  				},
  				'30%': {
  					backgroundColor: 'hsl(142 71% 45% / 0.2)',
  					transform: 'scale(1.02) translateY(-4px)'
  				},
  				'70%': {
  					backgroundColor: 'hsl(142 71% 45% / 0.1)',
  					transform: 'scale(1.01) translateY(-2px)'
  				},
  				'100%': {
  					backgroundColor: 'hsl(142 71% 45% / 0)',
  					transform: 'scale(1) translateY(0)'
  				}
  			},
  			'shake': {
  				'0%, 100%': {
  					transform: 'translateX(0) rotate(0deg)'
  				},
  				'15%': {
  					transform: 'translateX(-5px) rotate(-0.5deg)'
  				},
  				'30%': {
  					transform: 'translateX(5px) rotate(0.5deg)'
  				},
  				'45%': {
  					transform: 'translateX(-4px) rotate(-0.3deg)'
  				},
  				'60%': {
  					transform: 'translateX(4px) rotate(0.3deg)'
  				},
  				'75%': {
  					transform: 'translateX(-2px)'
  				},
  				'90%': {
  					transform: 'translateX(2px)'
  				}
  			},
  			'rank-down': {
  				'0%': {
  					backgroundColor: 'hsl(0 84% 60% / 0)',
  					transform: 'scale(1)'
  				},
  				'30%': {
  					backgroundColor: 'hsl(0 84% 60% / 0.15)',
  					transform: 'scale(1.02)'
  				},
  				'100%': {
  					backgroundColor: 'hsl(0 84% 60% / 0)',
  					transform: 'scale(1)'
  				}
  			},
  			'breathe': {
  				'0%, 100%': {
  					opacity: '0.4'
  				},
  				'50%': {
  					opacity: '0.8'
  				}
  			},
  			'fade-in-up': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(16px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'pulse-neon': 'pulse-neon 1.5s ease-in-out infinite',
  			'slide-up': 'slide-up 0.4s ease-out',
  			'slide-down-out': 'slide-down-out 0.4s ease-out',
  			'float': 'float 3s ease-in-out infinite',
  			'shimmer': 'shimmer 2s linear infinite',
  			'count-up': 'count-up 0.3s ease-out',
  			'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
  			'marquee': 'marquee 15s linear infinite',
  			'marquee-reverse': 'marquee-reverse 25s linear infinite',
  			'score-float': 'score-float 1.8s ease-out forwards',
  			'rank-up': 'rank-up 1.5s ease-out',
  			'rank-down': 'rank-down 1.5s ease-out',
  			'shake': 'shake 0.5s ease-out',
  			'breathe': 'breathe 4s ease-in-out infinite',
  			'fade-in-up': 'fade-in-up 0.5s ease-out both'
  		},
  		boxShadow: {
  			'2xs': 'var(--shadow-2xs)',
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
