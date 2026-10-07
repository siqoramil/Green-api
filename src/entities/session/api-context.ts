import type { GreenApiClient } from '@/shared/api'
import { createStrictContext } from '@/shared/lib'

export const [GreenApiContext, useGreenApi] = createStrictContext<GreenApiClient>('GreenApi')
