import { useQuery } from '@tanstack/react-query'
import { userApi } from '../lib/api'

/**
 * 时区调整 Hook
 * 根据用户设置的时间和时区偏移量调整日期显示
 */
export function useAdjustedTime() {
  const { data: user } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: userApi.me,
    staleTime: Infinity
  })

  const getAdjusted = (date?: Date | string) => {
    if (!date) return new Date()

    let dStr = typeof date === 'string' ? date : date.toISOString()
    if (!dStr.endsWith('Z') && !dStr.includes('+')) dStr += 'Z'

    const utcDate = new Date(dStr)
    const timezone = user?.timezone || 'UTC'

    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      })
      const parts = formatter.formatToParts(utcDate)
      const map: Record<string, string> = {}
      parts.forEach(p => map[p.type] = p.value)
      const tzDate = new Date(
        parseInt(map.year),
        parseInt(map.month) - 1,
        parseInt(map.day),
        parseInt(map.hour),
        parseInt(map.minute),
        parseInt(map.second)
      )
      return new Date(tzDate.getTime() + (user?.time_offset_mins || 0) * 60000)
    } catch (e) {
      return new Date(utcDate.getTime() + (user?.time_offset_mins || 0) * 60000)
    }
  }

  return {
    getAdjusted,
    offsetMins: user?.time_offset_mins || 0,
    timezone: user?.timezone
  }
}
