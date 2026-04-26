import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
	reactStrictMode: true,
	// oxfmt-ignore
	async redirects() {
		return [
			// Cards
			{ source: '/sets/origins/cards/hidden-blade', destination: '/cards/hidden-blade', permanent: true },
			{ source: '/sets/origins/cards/karthus-eternal', destination: '/cards/karthus-eternal', permanent: true },
			{ source: '/sets/spiritforged/cards/akshan-mischievous', destination: '/cards/akshan-mischievous', permanent: true },
			{ source: '/sets/spiritforged/cards/arcane-shift', destination: '/cards/arcane-shift', permanent: true },
			{ source: '/sets/spiritforged/cards/ezreal-prodigy', destination: '/cards/ezreal-prodigy', permanent: true },
			{ source: '/sets/spiritforged/cards/irelia-fervent', destination: '/cards/irelia-fervent', permanent: true },
			{ source: '/sets/spiritforged/cards/sunken-temple', destination: '/cards/sunken-temple', permanent: true },
			{ source: '/sets/spiritforged/cards/switcheroo', destination: '/cards/switcheroo', permanent: true },
			{ source: '/sets/spiritforged/cards/vex-cheerless', destination: '/cards/vex-cheerless', permanent: true },
			{ source: '/sets/unleashed/cards/abandoned-hall', destination: '/cards/abandoned-hall', permanent: true },
			{ source: '/sets/unleashed/cards/bone-skewer', destination: '/cards/bone-skewer', permanent: true },
			{ source: '/sets/unleashed/cards/heedless-resurrection', destination: '/cards/heedless-resurrection', permanent: true },
			{ source: '/sets/unleashed/cards/irresistible-faefolk', destination: '/cards/irresistible-faefolk', permanent: true },
			{ source: '/sets/unleashed/cards/thrill-of-the-hunt', destination: '/cards/thrill-of-the-hunt', permanent: true },
			{ source: '/sets/unleashed/cards/vex-apathetic', destination: '/cards/vex-apathetic', permanent: true },
			// Mechanics
			{ source: '/sets/spiritforged/mechanics/equipment', destination: '/mechanics/equipment', permanent: true },
			{ source: '/sets/spiritforged/mechanics/repeat', destination: '/mechanics/repeat', permanent: true },
		]
	},
}

export default withMDX(config)
