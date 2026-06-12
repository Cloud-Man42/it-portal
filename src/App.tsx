import { useMemo, useState } from 'react'
import { LoginPage } from './components/auth/LoginPage'
import { CategoryManagerModal } from './components/categories/CategoryManagerModal'
import { ApplicationFormModal } from './components/forms/ApplicationFormModal'
import { CategoryFormModal } from './components/forms/CategoryFormModal'
import { Dashboard, useFilteredCount } from './components/dashboard/Dashboard'
import { AppShell } from './components/layout/AppShell'
import type { CategoryFilterValue } from './components/filters/CategoryFilter'
import { PluginCatalogModal } from './components/plugins/PluginCatalogModal'
import { UserFormModal } from './components/users/UserFormModal'
import { UserManagerModal } from './components/users/UserManagerModal'
import { getNextColor } from './lib/categories'
import {
  canDeployPlugins,
  canManageUsers,
  canWriteApps,
  canWriteCategories,
} from './lib/permissions'
import { useApplications } from './hooks/useApplications'
import { usePlugins } from './hooks/usePlugins'
import { useAuth } from './hooks/useAuth'
import { useCategories } from './hooks/useCategories'
import { useUsers } from './hooks/useUsers'
import type { Application } from './types/application'
import type { CategoryGroup } from './types/category'
import type { User } from './types/user'

function App() {
  const { user, loading: authLoading, login, logout } = useAuth()
  const isAuthenticated = user !== null

  const {
    applications,
    refresh: refreshApplications,
    addApplication,
    updateApplication,
    deleteApplication,
  } = useApplications(isAuthenticated)
  const { loading: pluginsLoading, installingId, fetchCatalog, installPlugin } =
    usePlugins()
  const { categories, addCategory, updateCategory, deleteCategory } =
    useCategories(isAuthenticated)

  const canManageUserDb = user ? canManageUsers(user.role) : false
  const canEditApps = user ? canWriteApps(user.role) : false
  const canInstallPlugins = user ? canDeployPlugins(user.role) : false
  const canEditCategories = user ? canWriteCategories(user.role) : false

  const {
    users,
    loading: usersLoading,
    addUser,
    updateUser,
    deleteUser,
  } = useUsers(canManageUserDb)

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterValue>('All')
  const [appModalOpen, setAppModalOpen] = useState(false)
  const [pluginCatalogOpen, setPluginCatalogOpen] = useState(false)
  const [appModalMode, setAppModalMode] = useState<'add' | 'edit'>('add')
  const [editingApplication, setEditingApplication] = useState<Application | undefined>()

  const [groupManagerOpen, setGroupManagerOpen] = useState(false)
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [groupModalMode, setGroupModalMode] = useState<'add' | 'edit'>('add')
  const [editingCategory, setEditingCategory] = useState<CategoryGroup | undefined>()

  const [userManagerOpen, setUserManagerOpen] = useState(false)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [userModalMode, setUserModalMode] = useState<'add' | 'edit'>('add')
  const [editingUser, setEditingUser] = useState<User | undefined>()

  const applicationCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const app of applications) {
      counts[app.category] = (counts[app.category] ?? 0) + 1
    }
    return counts
  }, [applications])

  const filteredCount = useFilteredCount(
    applications,
    searchQuery,
    categoryFilter,
  )

  const openAddAppModal = () => {
    setAppModalMode('add')
    setEditingApplication(undefined)
    setAppModalOpen(true)
  }

  const openEditAppModal = (application: Application) => {
    setAppModalMode('edit')
    setEditingApplication(application)
    setAppModalOpen(true)
  }

  const openAddGroupModal = () => {
    setGroupModalMode('add')
    setEditingCategory(undefined)
    setGroupModalOpen(true)
  }

  const openEditGroupModal = (category: CategoryGroup) => {
    setGroupModalMode('edit')
    setEditingCategory(category)
    setGroupModalOpen(true)
  }

  const openAddUserModal = () => {
    setUserModalMode('add')
    setEditingUser(undefined)
    setUserModalOpen(true)
  }

  const openEditUserModal = (editUser: User) => {
    setUserModalMode('edit')
    setEditingUser(editUser)
    setUserModalOpen(true)
  }

  const handleDeleteGroup = async (category: CategoryGroup) => {
    const count = applicationCounts[category.id] ?? 0

    if (categories.length <= 1) {
      window.alert('At least one group must remain.')
      return
    }

    if (count > 0) {
      const fallback = categories.find((item) => item.id !== category.id)
      if (!fallback) return

      const confirmed = window.confirm(
        `"${category.name}" has ${count} application(s). Delete the group and move them to "${fallback.name}"?`,
      )
      if (!confirmed) return
    } else {
      const confirmed = window.confirm(`Delete group "${category.name}"?`)
      if (!confirmed) return
    }

    await deleteCategory(category.id)
    if (categoryFilter === category.id) {
      setCategoryFilter('All')
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading…
      </div>
    )
  }

  if (!user) {
    return <LoginPage onLogin={login} />
  }

  return (
    <>
      <AppShell
        categories={categories}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        applicationCount={applications.length}
        filteredCount={filteredCount}
        onAddClick={openAddAppModal}
        onAddFromCatalog={() => setPluginCatalogOpen(true)}
        onManageGroups={() => setGroupManagerOpen(true)}
        onManageUsers={() => setUserManagerOpen(true)}
        onLogout={() => void logout()}
        userDisplayName={user.displayName}
        userRole={user.role}
        canEditApps={canEditApps}
        canInstallPlugins={canInstallPlugins}
        canEditCategories={canEditCategories}
        canManageUsers={canManageUserDb}
      >
        <Dashboard
          applications={applications}
          categories={categories}
          searchQuery={searchQuery}
          categoryFilter={categoryFilter}
          onEdit={openEditAppModal}
          onDelete={(application) => void deleteApplication(application.id)}
          canEdit={canEditApps}
        />
      </AppShell>

      {canInstallPlugins && (
        <PluginCatalogModal
          open={pluginCatalogOpen}
          installedApplications={applications}
          onClose={() => setPluginCatalogOpen(false)}
          onFetchCatalog={fetchCatalog}
            onInstall={async (pluginId, options) => {
              const application = await installPlugin(pluginId, options)
              await refreshApplications()
              return application
            }}
          loading={pluginsLoading}
          installingId={installingId}
        />
      )}

      {canEditApps && (
        <ApplicationFormModal
          open={appModalOpen}
          mode={appModalMode}
          categories={categories}
          initialValues={editingApplication}
          onClose={() => setAppModalOpen(false)}
          onSubmit={(input) => {
            if (appModalMode === 'edit' && editingApplication) {
              void updateApplication(editingApplication.id, input)
            } else {
              void addApplication(input)
            }
          }}
        />
      )}

      {canEditCategories && (
        <>
          <CategoryManagerModal
            open={groupManagerOpen}
            categories={categories}
            applicationCounts={applicationCounts}
            onClose={() => setGroupManagerOpen(false)}
            onAdd={openAddGroupModal}
            onEdit={openEditGroupModal}
            onDelete={(category) => void handleDeleteGroup(category)}
          />

          <CategoryFormModal
            open={groupModalOpen}
            mode={groupModalMode}
            initialValues={editingCategory}
            existingNames={categories.map((category) => category.name)}
            onClose={() => setGroupModalOpen(false)}
            onSubmit={(input) => {
              if (groupModalMode === 'edit' && editingCategory) {
                void updateCategory(editingCategory.id, input)
              } else {
                void addCategory({
                  ...input,
                  color: input.color || getNextColor(categories.length),
                })
              }
            }}
          />
        </>
      )}

      {canManageUserDb && (
        <>
          <UserManagerModal
            open={userManagerOpen}
            users={users}
            currentUserId={user.id}
            loading={usersLoading}
            onClose={() => setUserManagerOpen(false)}
            onAdd={openAddUserModal}
            onEdit={openEditUserModal}
            onDelete={(deleteTarget) => void deleteUser(deleteTarget.id)}
          />

          <UserFormModal
            open={userModalOpen}
            mode={userModalMode}
            initialValues={editingUser}
            existingUsernames={users.map((item) => item.username)}
            onClose={() => setUserModalOpen(false)}
            onSubmit={(input) => {
              if (userModalMode === 'edit' && editingUser) {
                return updateUser(editingUser.id, input)
              }
              return addUser(input)
            }}
          />
        </>
      )}
    </>
  )
}

export default App
