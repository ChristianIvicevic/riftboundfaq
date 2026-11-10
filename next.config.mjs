import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
	reactStrictMode: true,
	serverExternalPackages: ['@takumi-rs/core'],
	// oxfmt-ignore
	async redirects() {
		return [
			// Rulings
			{ source: '/card-errata-list', destination: '/rulings/card-errata-list', permanent: true },
			{ source: '/cards/:path+', destination: '/rulings/cards/:path+', permanent: true },
			{ source: '/general-rules/:path+', destination: '/rulings/general-rules/:path+', permanent: true },
			{ source: '/mechanics/:path+', destination: '/rulings/mechanics/:path+', permanent: true },
			{ source: '/og/card-errata-list/:path+', destination: '/og/rulings/card-errata-list/:path+', permanent: true },
			{ source: '/og/cards/:path+', destination: '/og/rulings/cards/:path+', permanent: true },
			{ source: '/og/general-rules/:path+', destination: '/og/rulings/general-rules/:path+', permanent: true },
			{ source: '/og/mechanics/:path+', destination: '/og/rulings/mechanics/:path+', permanent: true },
			// Rules Documents
			{ source: '/rules-documents/core-rules', destination: '/rules-documents#core-rules', permanent: false },
			{ source: '/rules-documents/tournament-rules', destination: '/rules-documents#tournament-rules', permanent: false },
			{ source: '/reference/core-rules', destination: '/rules-documents#core-rules', permanent: true },
			{ source: '/reference/tournament-rules', destination: '/rules-documents#tournament-rules', permanent: true },
			{ source: '/reference/vendetta-patch-notes', destination: '/rules-documents/core-rules/changes/1.4', permanent: true },
			{ source: '/reference/unleashed-patch-notes', destination: '/rules-documents/core-rules/changes/1.3', permanent: true },
			{ source: '/reference/spiritforged-patch-notes', destination: '/rules-documents/core-rules/changes/1.2', permanent: true },
			{ source: '/reference/patch-notes/vendetta', destination: '/rules-documents/core-rules/changes/1.4', permanent: true },
			{ source: '/reference/patch-notes/unleashed', destination: '/rules-documents/core-rules/changes/1.3', permanent: true },
			{ source: '/reference/patch-notes/spiritforged', destination: '/rules-documents/core-rules/changes/1.2', permanent: true },
			{ source: '/reference', destination: '/rules-documents', permanent: true },
			{ source: '/reference/:path*', destination: '/rules-documents/:path*', permanent: true },
			{ source: '/og/reference/:path*', destination: '/og/rules-documents/:path*', permanent: true },
			// Cards
			{ source: '/sets/origins/cards/hidden-blade', destination: '/rulings/cards/hidden-blade', permanent: true },
			{ source: '/sets/origins/cards/karthus-eternal', destination: '/rulings/cards/karthus-eternal', permanent: true },
			{ source: '/sets/spiritforged/cards/akshan-mischievous', destination: '/rulings/cards/akshan-mischievous', permanent: true },
			{ source: '/sets/spiritforged/cards/arcane-shift', destination: '/rulings/cards/arcane-shift', permanent: true },
			{ source: '/sets/spiritforged/cards/ezreal-prodigy', destination: '/rulings/cards/ezreal-prodigy', permanent: true },
			{ source: '/sets/spiritforged/cards/irelia-fervent', destination: '/rulings/cards/irelia-fervent', permanent: true },
			{ source: '/sets/spiritforged/cards/sunken-temple', destination: '/rulings/cards/sunken-temple', permanent: true },
			{ source: '/sets/spiritforged/cards/switcheroo', destination: '/rulings/cards/switcheroo', permanent: true },
			{ source: '/sets/spiritforged/cards/vex-cheerless', destination: '/rulings/cards/vex-cheerless', permanent: true },
			{ source: '/sets/unleashed/cards/abandoned-hall', destination: '/rulings/cards/abandoned-hall', permanent: true },
			{ source: '/sets/unleashed/cards/bone-skewer', destination: '/rulings/cards/bone-skewer', permanent: true },
			{ source: '/sets/unleashed/cards/heedless-resurrection', destination: '/rulings/cards/heedless-resurrection', permanent: true },
			{ source: '/sets/unleashed/cards/irresistible-faefolk', destination: '/rulings/cards/irresistible-faefolk', permanent: true },
			{ source: '/sets/unleashed/cards/thrill-of-the-hunt', destination: '/rulings/cards/thrill-of-the-hunt', permanent: true },
			{ source: '/sets/unleashed/cards/vex-apathetic', destination: '/rulings/cards/vex-apathetic', permanent: true },
			// Mechanics
			{ source: '/sets/spiritforged/mechanics/equipment', destination: '/rulings/mechanics/equipment', permanent: true },
			{ source: '/sets/spiritforged/mechanics/repeat', destination: '/rulings/mechanics/repeat', permanent: true },
		]
	},
}

export default withMDX(config)
