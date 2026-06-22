'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from './AppHeader'
import * as ga from '../lib/analytics'

interface ImportantMemory {
  id: string
  type: string
  content: string
  importance: number
}

interface ProfileClientProps {
  email: string
  entryCount: number
  createdAtString: string
  initialName: string
  initialLifeVision: string
  initialCurrentMission: string
  initialTopGoal: string
  initialTopFear: string
  initialValues: string
  initialWhoIWantToBecome: string
  importantMemories: ImportantMemory[]
}

export default function ProfileClient({
  email,
  entryCount,
  createdAtString,
  initialName,
  initialLifeVision,
  initialCurrentMission,
  initialTopGoal,
  initialTopFear,
  initialValues,
  initialWhoIWantToBecome,
  importantMemories,
}: ProfileClientProps) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [lifeVision, setLifeVision] = useState(initialLifeVision)
  const [currentMission, setCurrentMission] = useState(initialCurrentMission)
  const [topGoal, setTopGoal] = useState(initialTopGoal)
  const [topFear, setTopFear] = useState(initialTopFear)
  const [values, setValues] = useState(initialValues)
  const [whoIWantToBecome, setWhoIWantToBecome] = useState(initialWhoIWantToBecome)

  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    setProfileLoading(true)

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          lifeVision,
          currentMission,
          topGoal,
          topFear,
          values,
          whoIWantToBecome,
        }),
      })

      const data = await res.json()
      if (data.success) {
        // Fire analytics event
        ga.event('profile_updated')

        setProfileSuccess('Profile saved.')
        router.refresh()
      } else {
        setProfileError(data.error || 'Unable to save profile.')
      }
    } catch {
      setProfileError('Network error. Please try again.')
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }

    setPasswordLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change-password',
          oldPassword,
          newPassword,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setPasswordSuccess('Password updated.')
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPasswordError(data.error || 'Unable to update password.')
      }
    } catch {
      setPasswordError('Network error. Please try again.')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleLogout = async () => {
    setLogoutLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      })

      const data = await res.json()
      if (data.success) {
        router.push('/login')
        router.refresh()
      } else {
        setLogoutLoading(false)
      }
    } catch {
      setLogoutLoading(false)
    }
  }

  const memberSince = new Date(createdAtString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <AppHeader />

      <main id="main-content" className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-12">
        <section className="space-y-6">
          <div>
            <p className="section-label">Profile</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              What your future self should remember.
            </h1>
          </div>

          <form onSubmit={handleProfileSave} className="surface-panel space-y-5 p-5 sm:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="form-label" htmlFor="profile-name">
                  Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="form-field"
                  placeholder="What should your older self call you?"
                />
              </div>

              <div>
                <label className="form-label" htmlFor="profile-current-focus">
                  Current Focus
                </label>
                <input
                  id="profile-current-focus"
                  type="text"
                  value={currentMission}
                  onChange={(event) => setCurrentMission(event.target.value)}
                  className="form-field"
                  placeholder="What has most of your attention?"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="form-label" htmlFor="profile-top-goal">
                  Biggest Goal
                </label>
                <input
                  id="profile-top-goal"
                  type="text"
                  value={topGoal}
                  onChange={(event) => setTopGoal(event.target.value)}
                  className="form-field"
                  placeholder="What are you building toward?"
                />
              </div>

              <div>
                <label className="form-label" htmlFor="profile-top-fear">
                  Biggest Fear
                </label>
                <input
                  id="profile-top-fear"
                  type="text"
                  value={topFear}
                  onChange={(event) => setTopFear(event.target.value)}
                  className="form-field"
                  placeholder="What keeps returning?"
                />
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="profile-life-vision">
                Life Vision
              </label>
              <textarea
                id="profile-life-vision"
                rows={4}
                value={lifeVision}
                onChange={(event) => setLifeVision(event.target.value)}
                className="form-field resize-y leading-7"
                placeholder="Describe the life you want to be able to look back from."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="form-label" htmlFor="profile-values">
                  Core Values
                </label>
                <textarea
                  id="profile-values"
                  rows={4}
                  value={values}
                  onChange={(event) => setValues(event.target.value)}
                  className="form-field resize-y leading-7"
                  placeholder="What do you want to protect?"
                />
              </div>

              <div>
                <label className="form-label" htmlFor="profile-future-vision">
                  Future Vision
                </label>
                <textarea
                  id="profile-future-vision"
                  rows={4}
                  value={whoIWantToBecome}
                  onChange={(event) => setWhoIWantToBecome(event.target.value)}
                  className="form-field resize-y leading-7"
                  placeholder="Who are you trying to become?"
                />
              </div>
            </div>

            {profileError && <p className="text-sm font-medium text-red-600">{profileError}</p>}
            {profileSuccess && <p className="text-sm font-medium text-[var(--color-green)]">{profileSuccess}</p>}

            <button type="submit" disabled={profileLoading} className="btn-primary">
              {profileLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="surface-panel p-5">
            <p className="section-label">Account</p>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-[var(--color-muted)]">Email</dt>
                <dd className="mt-1 truncate font-medium">{email}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted)]">Reflections</dt>
                <dd className="mt-1 font-medium">{entryCount}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted)]">Member Since</dt>
                <dd className="mt-1 font-medium">{memberSince}</dd>
              </div>
            </dl>
          </section>

          <section className="surface-panel p-5">
            <p className="section-label">Important Memories</p>
            <div className="mt-4 space-y-3">
              {importantMemories.length === 0 ? (
                <p className="text-sm leading-6 text-[var(--color-muted)]">
                  Memories will collect here as your reflections repeat, resolve, or change.
                </p>
              ) : (
                importantMemories.map((memory) => (
                  <div key={memory.id} className="border-l-2 border-[var(--color-blue)] pl-3">
                    <p className="text-xs uppercase text-[var(--color-muted)]">{memory.type}</p>
                    <p className="mt-1 text-sm leading-6">{memory.content}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="surface-panel p-5">
            <p className="section-label">Password</p>
            <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
              <div>
                <label className="form-label" htmlFor="oldPassword">
                  Current Password
                </label>
                <input
                  id="oldPassword"
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(event) => setOldPassword(event.target.value)}
                  className="form-field"
                />
              </div>
              <div>
                <label className="form-label" htmlFor="newPassword">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="form-field"
                />
              </div>
              <div>
                <label className="form-label" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="form-field"
                />
              </div>

              {passwordError && <p className="text-sm font-medium text-red-600">{passwordError}</p>}
              {passwordSuccess && <p className="text-sm font-medium text-[var(--color-green)]">{passwordSuccess}</p>}

              <button type="submit" disabled={passwordLoading} className="btn-secondary w-full">
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </section>

          <button
            type="button"
            onClick={handleLogout}
            disabled={logoutLoading}
            className="btn-secondary w-full border-red-200 text-red-700 hover:bg-red-50"
          >
            {logoutLoading ? 'Signing out...' : 'Sign Out'}
          </button>
        </aside>
      </main>
    </div>
  )
}
