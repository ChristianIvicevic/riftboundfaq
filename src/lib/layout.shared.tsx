import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { GITHUB_REPO_URL } from '@/lib/constants'

export function baseOptions(): BaseLayoutProps {
	return { nav: { title: 'Riftbound FAQ' }, githubUrl: GITHUB_REPO_URL }
}
