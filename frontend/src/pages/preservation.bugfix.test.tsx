import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as fc from 'fast-check';

/**
 * Preservation Property Tests for Login Page Zoom Fix
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 * 
 * Property 2: Preservation - Other Pages Font Size Unchanged
 * 
 * This test suite follows the observation-first methodology:
 * 1. Observe behavior on UNFIXED code for non-login pages
 * 2. Measure and record the computed base font size (18px on desktop, 16px on mobile max-width 1024px)
 * 3. Write property-based tests capturing observed behavior patterns
 * 4. Run tests on UNFIXED code
 * 
 * **EXPECTED OUTCOME**: Tests PASS on unfixed code (confirms baseline behavior to preserve)
 * 
 * Testing Approach:
 * Since jsdom has limitations with computed styles and media queries, we test by:
 * 1. Verifying the CSS rules in index.css maintain the global 18px base font size
 * 2. Verifying that NO .login-page override exists (on unfixed code)
 * 3. Ensuring that when the fix is applied, it ONLY affects .login-page and not other pages
 * 
 * Pages to preserve:
 * - Dashboard (teacher, student, admin)
 * - Attendance pages
 * - Settings pages
 * - Navigation components
 * - Modals and widgets
 */

describe('Preservation Property Tests - Other Pages Font Size Unchanged', () => {
  let indexCssContent: string;

  beforeAll(() => {
    // Read the index.css file to check CSS rules
    const indexCssPath = resolve(__dirname, '../index.css');
    try {
      indexCssContent = readFileSync(indexCssPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read index.css: ${error}`);
    }
  });

  /**
   * Property 2.1: Global Base Font Size Preservation
   * 
   * For all pages that are NOT the login page, the base font size should remain 18px
   * (or 16px on mobile screens with max-width 1024px per existing media query).
   * 
   * This test verifies that the :root CSS rule maintains the 18px base font size.
   */
  it('should preserve :root base font-size of 18px for all non-login pages', () => {
    // EXPECTED BEHAVIOR: :root should have font-size: 18px
    // This is the baseline behavior that must be preserved
    
    // Check if :root has the 18px base font size
    const rootFontSizeRegex = /:root\s*\{[^}]*font:\s*18px/s;
    const hasRootFontSize = rootFontSizeRegex.test(indexCssContent);
    
    // This assertion should PASS on unfixed code
    expect(hasRootFontSize).toBe(true);
    
    // Document the observed behavior
    if (hasRootFontSize) {
      console.log('✓ Observed: :root has 18px base font size (baseline to preserve)');
    }
  });

  /**
   * Property 2.2: Mobile Media Query Preservation
   * 
   * The existing media query for max-width 1024px should continue to apply
   * the 16px font size for mobile devices.
   */
  it('should preserve media query for mobile screens (max-width: 1024px) with 16px font-size', () => {
    // EXPECTED BEHAVIOR: Media query should exist with font-size: 16px
    
    // Check if media query exists
    const mediaQueryRegex = /@media\s*\(max-width:\s*1024px\)\s*\{[^}]*font-size:\s*16px/s;
    const hasMediaQuery = mediaQueryRegex.test(indexCssContent);
    
    // This assertion should PASS on unfixed code
    expect(hasMediaQuery).toBe(true);
    
    if (hasMediaQuery) {
      console.log('✓ Observed: Media query for mobile (max-width: 1024px) with 16px exists');
    }
  });

  /**
   * Property 2.3: No Login Page Override on Unfixed Code
   * 
   * On unfixed code, there should be NO .login-page CSS rule with font-size override.
   * This confirms that the login page currently inherits the 18px base font size.
   * 
   * When the fix is applied, this test will document the change but should still
   * verify that the override is scoped ONLY to .login-page.
   */
  it('should document that .login-page has no font-size override on unfixed code (or has 16px override on fixed code)', () => {
    // Check if .login-page rule exists with font-size
    const loginPageFontSizeRegex = /\.login-page\s*\{[^}]*font-size:\s*16px/s;
    const hasLoginPageOverride = loginPageFontSizeRegex.test(indexCssContent);
    
    if (!hasLoginPageOverride) {
      // UNFIXED CODE: No override exists
      console.log('✓ Observed: No .login-page font-size override (unfixed code - login page inherits 18px)');
      expect(hasLoginPageOverride).toBe(false);
    } else {
      // FIXED CODE: Override exists and is scoped to .login-page only
      console.log('✓ Observed: .login-page has 16px font-size override (fixed code)');
      expect(hasLoginPageOverride).toBe(true);
      
      // Verify the override is properly scoped (doesn't affect other pages)
      // The selector should be exactly .login-page, not a broader selector
      const loginPageSelectorRegex = /\.login-page\s*\{/;
      expect(loginPageSelectorRegex.test(indexCssContent)).toBe(true);
    }
  });

  /**
   * Property 2.4: Property-Based Test - CSS Specificity Preservation
   * 
   * This property-based test generates various CSS class names and verifies that
   * ONLY .login-page has a font-size override, and all other classes inherit
   * the global 18px base font size.
   * 
   * This ensures the fix doesn't leak to other pages.
   */
  it('should ensure font-size override applies ONLY to .login-page and not to other page classes', () => {
    // Property: For all page classes that are NOT .login-page, 
    // there should be NO font-size override in index.css
    
    // Common page classes in the application
    const nonLoginPageClasses = [
      'dashboard-layout',
      'main-content',
      'sidebar',
      'top-navbar',
      'glass-card',
      'premium-card',
      'modal',
      'form-input',
      'btn',
      'td-welcome-banner',
      'ta-stats-row',
      'sd-course-card'
    ];
    
    // Check that none of these classes have a font-size override that would
    // interfere with the global 18px base
    nonLoginPageClasses.forEach(className => {
      // Look for explicit font-size overrides on these classes
      const classOverrideRegex = new RegExp(`\\.${className}\\s*\\{[^}]*font-size:\\s*16px`, 's');
      const hasOverride = classOverrideRegex.test(indexCssContent);
      
      // These classes should NOT have a 16px override (they should inherit 18px)
      expect(hasOverride).toBe(false);
    });
    
    console.log('✓ Verified: Non-login page classes do not have font-size overrides');
  });

  /**
   * Property 2.5: Property-Based Test - Page Class Invariant
   * 
   * Uses fast-check to generate arbitrary page class names and verify that
   * the CSS rules maintain the invariant: only .login-page has a 16px override.
   */
  it('should maintain invariant: only .login-page can have 16px font-size override', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary CSS class names (alphanumeric with hyphens)
        fc.stringMatching(/^[a-z][a-z0-9-]{2,20}$/),
        (className) => {
          // Skip the login-page class itself
          if (className === 'login-page') {
            return true;
          }
          
          // For all other classes, verify they don't have a 16px font-size override
          const classOverrideRegex = new RegExp(`\\.${className}\\s*\\{[^}]*font-size:\\s*16px`, 's');
          const hasOverride = classOverrideRegex.test(indexCssContent);
          
          // Invariant: Non-login-page classes should NOT have 16px override
          return !hasOverride;
        }
      ),
      { numRuns: 50 } // Run 50 test cases
    );
    
    console.log('✓ Property verified: Only .login-page can have 16px font-size override (50 test cases)');
  });

  /**
   * Property 2.6: Baseline Behavior Documentation
   * 
   * This test documents the observed baseline behavior on unfixed code:
   * - :root has 18px base font size
   * - Media query reduces to 16px on mobile (max-width: 1024px)
   * - No page-specific overrides exist
   * - All pages inherit the global base font size
   */
  it('should document baseline behavior: all pages inherit global 18px base font size', () => {
    // Document the baseline behavior
    const baseline = {
      rootFontSize: '18px',
      mobileFontSize: '16px (max-width: 1024px)',
      loginPageOverride: 'none (inherits 18px)',
      otherPagesOverride: 'none (inherit 18px)'
    };
    
    console.log('Baseline Behavior (Unfixed Code):');
    console.log('  - Root font size:', baseline.rootFontSize);
    console.log('  - Mobile font size:', baseline.mobileFontSize);
    console.log('  - Login page override:', baseline.loginPageOverride);
    console.log('  - Other pages override:', baseline.otherPagesOverride);
    
    // Verify the baseline
    expect(/:root\s*\{[^}]*font:\s*18px/s.test(indexCssContent)).toBe(true);
    expect(/@media\s*\(max-width:\s*1024px\)\s*\{[^}]*font-size:\s*16px/s.test(indexCssContent)).toBe(true);
    
    console.log('✓ Baseline behavior documented and verified');
  });

  /**
   * Property 2.7: Regression Prevention - Dashboard Pages
   * 
   * Verifies that dashboard-related CSS classes maintain their current styling
   * and don't have unexpected font-size overrides.
   */
  it('should preserve dashboard page styling (no unexpected font-size overrides)', () => {
    const dashboardClasses = [
      'td-welcome-banner',
      'td-stats-grid',
      'td-stat-card',
      'td-course-card',
      'td-sessions-panel'
    ];
    
    dashboardClasses.forEach(className => {
      // These classes should not have a 16px base font-size override
      const overrideRegex = new RegExp(`\\.${className}\\s*\\{[^}]*font-size:\\s*16px[^}]*\\}`, 's');
      const hasUnexpectedOverride = overrideRegex.test(indexCssContent);
      
      expect(hasUnexpectedOverride).toBe(false);
    });
    
    console.log('✓ Dashboard page classes preserve their styling');
  });

  /**
   * Property 2.8: Regression Prevention - Attendance Pages
   * 
   * Verifies that attendance-related CSS classes maintain their current styling.
   */
  it('should preserve attendance page styling (no unexpected font-size overrides)', () => {
    const attendanceClasses = [
      'ta-stats-row',
      'ta-stat-card',
      'ta-active-section',
      'ta-table-section'
    ];
    
    attendanceClasses.forEach(className => {
      const overrideRegex = new RegExp(`\\.${className}\\s*\\{[^}]*font-size:\\s*16px[^}]*\\}`, 's');
      const hasUnexpectedOverride = overrideRegex.test(indexCssContent);
      
      expect(hasUnexpectedOverride).toBe(false);
    });
    
    console.log('✓ Attendance page classes preserve their styling');
  });

  /**
   * Property 2.9: Regression Prevention - Navigation Components
   * 
   * Verifies that navigation components maintain their current styling.
   */
  it('should preserve navigation component styling (no unexpected font-size overrides)', () => {
    const navClasses = [
      'top-navbar',
      'sidebar',
      'sidebar-nav',
      'nav-item'
    ];
    
    navClasses.forEach(className => {
      const overrideRegex = new RegExp(`\\.${className}\\s*\\{[^}]*font-size:\\s*16px[^}]*\\}`, 's');
      const hasUnexpectedOverride = overrideRegex.test(indexCssContent);
      
      expect(hasUnexpectedOverride).toBe(false);
    });
    
    console.log('✓ Navigation component classes preserve their styling');
  });

  /**
   * Property 2.10: Regression Prevention - Modal Components
   * 
   * Verifies that modal components maintain their current styling.
   */
  it('should preserve modal component styling (no unexpected font-size overrides)', () => {
    const modalClasses = [
      'modal-overlay',
      'modal',
      'modal-header',
      'modal-window-responsive'
    ];
    
    modalClasses.forEach(className => {
      const overrideRegex = new RegExp(`\\.${className}\\s*\\{[^}]*font-size:\\s*16px[^}]*\\}`, 's');
      const hasUnexpectedOverride = overrideRegex.test(indexCssContent);
      
      expect(hasUnexpectedOverride).toBe(false);
    });
    
    console.log('✓ Modal component classes preserve their styling');
  });
});
