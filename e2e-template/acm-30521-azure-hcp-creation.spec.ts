/* Copyright Contributors to the Open Cluster Management project */
/**
 * Playwright E2E test for ACM-30521: Azure HCP cluster creation UI.
 *
 * Verifies:
 * 1. Azure card in the infrastructure catalog navigates to control plane selection
 * 2. Control plane selection page shows Hosted and Standalone cards
 * 3. Hosted card navigates to Azure HCP CLI instructions page
 * 4. CLI instructions page shows all 7 steps
 */
import { test, expect, type Page } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config()

const requiredEnvVars = ['OCP_USERNAME', 'OCP_PASSWORD'] as const
const missingVars = requiredEnvVars.filter((key) => !process.env[key])
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
}

const RHACM_URL = process.env.RHACM_URL || 'http://localhost:9000'
const OCP_USERNAME = process.env.OCP_USERNAME!
const OCP_PASSWORD = process.env.OCP_PASSWORD!

async function loginToOCP(page: Page): Promise<void> {
  await page.goto(RHACM_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.waitForLoadState('load')

  // Already logged in — console content is showing, skip login flow.
  const alreadyLoggedIn = await page
    .locator('#page-sidebar, [data-test="nav"], .pf-v5-c-page__sidebar, .pf-c-page__sidebar')
    .first()
    .isVisible({ timeout: 3_000 })
    .catch(() => false)
  if (alreadyLoggedIn) return

  // OCP OAuth login page — may redirect through an identity provider.
  const providerLink = page.locator('a.idp')
  const hasProviderSelection = await providerLink.first().isVisible({ timeout: 10_000 }).catch(() => false)
  if (hasProviderSelection) {
    const providerCount = await providerLink.count()
    if (providerCount === 1) {
      await providerLink.first().click()
    } else {
      const kubeAdmin = page.locator('a.idp:has-text("kube:admin")')
      const htpasswd = page.locator('a.idp:text-matches("htpasswd", "i")')
      if (await kubeAdmin.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await kubeAdmin.click()
      } else if (await htpasswd.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await htpasswd.first().click()
      } else {
        await providerLink.first().click()
      }
    }
    await page.waitForLoadState('load')
  }

  const usernameField = page.locator('#inputUsername, input[name="username"], input[type="text"]').first()
  await usernameField.waitFor({ state: 'visible', timeout: 15_000 })
  await usernameField.fill(OCP_USERNAME)

  const passwordField = page.locator('#inputPassword, input[name="password"], input[type="password"]').first()
  await passwordField.fill(OCP_PASSWORD)

  await page.locator('button[type="submit"]').click()

  const approveButton = page.locator(
    'input[name="approve"], button:has-text("Allow selected permissions"), button[type="submit"]:has-text("Log in")'
  )
  const needsApproval = await approveButton.first().isVisible({ timeout: 5_000 }).catch(() => false)
  if (needsApproval) {
    await approveButton.first().click()
  }

  await page.waitForLoadState('load', { timeout: 30_000 })

  await expect(
    page.locator('#page-sidebar, [data-test="nav"], .pf-v5-c-page__sidebar, .pf-c-page__sidebar').first()
  ).toBeVisible({ timeout: 30_000 })
}

test.describe('ACM-30521: Azure HCP cluster creation UI', () => {
  test.use({
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 },
  })

  test.setTimeout(120_000)

  test('should navigate from catalog to Azure control plane selection page', async ({ page }) => {
    await loginToOCP(page)

    // Navigate to the cluster creation catalog
    await page.goto(`${RHACM_URL}/multicloud/infrastructure/clusters/create`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    await page.waitForLoadState('load')

    // Find and click the Azure card
    const azureCard = page.locator('[data-testid="azure"], [id="azure"]')
    await expect(azureCard).toBeVisible({ timeout: 15_000 })
    await azureCard.click()

    // Verify we are on the Azure control plane selection page
    await expect(page).toHaveURL(/\/azure\/control-plane/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Control plane type - Azure' })).toBeVisible({ timeout: 10_000 })

    // Verify both Hosted and Standalone cards are present
    const hostedCard = page.locator('[data-testid="hosted"], [id="hosted"]')
    const standaloneCard = page.locator('[data-testid="standalone"], [id="standalone"]')
    await expect(hostedCard).toBeVisible()
    await expect(standaloneCard).toBeVisible()
  })

  test('should navigate from Azure control plane to CLI instructions page', async ({ page }) => {
    await loginToOCP(page)

    // Navigate directly to the Azure control plane selection page
    await page.goto(`${RHACM_URL}/multicloud/infrastructure/clusters/create/azure/control-plane`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    await page.waitForLoadState('load')

    // Wait for the page to render
    await expect(page.getByRole('heading', { name: 'Control plane type - Azure' })).toBeVisible({ timeout: 15_000 })

    // Click the Hosted card (if hypershift is enabled it will navigate)
    const hostedCard = page.locator('[data-testid="hosted"], [id="hosted"]')
    await expect(hostedCard).toBeVisible()
    await hostedCard.click()

    // If hypershift is enabled, we should navigate to the CLI page
    // If not, the card click does nothing (alert is shown instead)
    const isOnCliPage = await page
      .waitForURL(/\/azure\/cli/, { timeout: 5_000 })
      .then(() => true)
      .catch(() => false)

    if (isOnCliPage) {
      // Verify the CLI instructions page shows all 7 steps
      await expect(page.getByText('Prerequisites', { exact: true })).toBeVisible({ timeout: 10_000 })
      await expect(page.getByText('Prepare environment variables')).toBeVisible()
      await expect(page.getByText('Create Azure credentials file')).toBeVisible()
      await expect(page.getByText('Configure OIDC issuer')).toBeVisible()
      await expect(page.getByText('Create workload identities')).toBeVisible()
      await expect(page.getByText('Create Azure infrastructure')).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Create the Hosted Control Plane' })).toBeVisible()

      // Verify the main cluster creation command is shown
      await expect(page.locator('#code-content')).toContainText('hcp create cluster azure')
    } else {
      // Hypershift is not enabled — verify the alert is shown
      await expect(
        page.getByText('Hosted control plane operator must be enabled in order to continue')
      ).toBeVisible({ timeout: 5_000 })
    }
  })

  test('should show all CLI steps when navigating directly to Azure CLI page', async ({ page }) => {
    await loginToOCP(page)

    // Navigate directly to the Azure CLI instructions page
    await page.goto(`${RHACM_URL}/multicloud/infrastructure/clusters/create/azure/cli`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    await page.waitForLoadState('load')

    // Verify all 7 steps are visible
    await expect(page.getByText('Prerequisites', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Prepare environment variables')).toBeVisible()
    await expect(page.getByText('Create Azure credentials file')).toBeVisible()
    await expect(page.getByText('Configure OIDC issuer')).toBeVisible()
    await expect(page.getByText('Create workload identities')).toBeVisible()
    await expect(page.getByText('Create Azure infrastructure')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Create the Hosted Control Plane' })).toBeVisible()

    // Verify breadcrumbs contain expected entries
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"], .pf-v6-c-breadcrumb')
    await expect(breadcrumb.getByText('Control plane type - Azure')).toBeVisible()
    await expect(breadcrumb.getByText('Create cluster')).toBeVisible()

    // Verify code blocks with Azure CLI commands
    await expect(page.locator('#code-content')).toContainText('hcp create cluster azure')
    await expect(page.locator('#helper-command')).toContainText('hcp create cluster azure --help')

    // Verify Copy login command instruction
    await expect(page.getByText('Copy login command')).toBeVisible()
  })
})
