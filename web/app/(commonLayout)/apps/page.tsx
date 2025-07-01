'use client'
import { useTranslation } from 'react-i18next'

import Apps from './Apps'
import { useEducationInit } from '@/app/education-apply/hooks'
import { useGlobalPublicStore } from '@/context/global-public-context'

const AppList = () => {
  const { t } = useTranslation()
  useEducationInit()
  const { systemFeatures } = useGlobalPublicStore()
  return (
    <div className='relative flex h-0 shrink-0 grow flex-col overflow-y-auto bg-background-body'>
      <Apps />

    </div >
  )
}

export default AppList
