import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';
import fs from 'fs';
import path from 'path';

/**
 * Bug Condition Exploration Test for Login Page Zoom Fix
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 * 
 * Property 1: Bug Condition - Login Page Font Size Oversized
 * 
 * This test is designed to FAIL on unfixed code to demonstrate the bug exists.
 * The test encodes the EXPECTED behavior (16px base font size).
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
 * When the fix is applied, this same test will PASS, confirming the bug is fixed.
 * 
 * Bug Description:
 * The login page displays all elements at an oversized scale due to the global 
 * base font size of 18px set in frontend/src/index.css. This creates a zoomed-in 
 * appearance that affects text, form inputs, buttons, and headings.
 * 
 * Expected Counterexamples on Unfixed Code:
 * - Login page does NOT have a specific font-size override in index.css
 * - The .login-page class inherits the 18px base font size from :root
 * - All rem-based sizes are 12.5% larger than intended
 * - Hero title appears at ~39.6px instead of ~35.2px (2.2rem * 18px vs 2.2rem * 16px)
 * - Form inputs appear at ~16.2px instead of ~14.4px (0.9rem * 18px vs 0.9rem * 16px)
 * - Buttons appear at ~16.2px instead of ~14.4px (0.9rem * 18px vs 0.9rem * 16px)
 * 
 * Testing Approach:
 * Since jsdom has limitations with computed styles, we test by checking the CSS
 * rules directly in index.css. The fix should add a .login-page rule with font-size: 16px.
 */

describe('Login Page Bug Condition Exploration', () => {
  let indexCssContent: string;

  beforeEach(() => {
    // Read the index.css file to check for the fix
    const indexCssPath = path.join(__dirname, '../../index.css');
    indexCssContent = fs.readFileSync(indexCssPath, 'utf-8');
  });

  /**
   * Helper to render the Login component with required providers
   */
  const renderLogin = () => {
    return render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
  };

  it('should have .login-page CSS rule with 16px font-size in index.css (EXPECTED TO FAIL on unfixed code)', () => {
    // EXPECTED BEHAVIOR: index.css should contain a .login-page rule with font-size: 16px
    // ON UNFIXED CODE: This rule does NOT exist, so the test will FAIL
    
    // Check if .login-page rule exists with font-size: 16px
    const hasLoginPageRule = /\.login-page\s*\{[^}]*font-size:\s*16px/s.test(indexCssContent);
    
    // This assertion will FAIL on unfixed code, confirming the bug exists
    expect(hasLoginPageRule).toBe(true);
  });

  it('should verify :root has 18px base font size (baseline check)', () => {
    // This should PASS on both unfixed and fixed code
    // It confirms the global base font size that causes the bug
    const hasRootFontSize = /:root\s*\{[^}]*font:\s*18px/s.test(indexCssContent);
    
    expect(hasRootFontSize).toBe(true);
  });

  it('should render login page with correct structure', () => {
    const { container } = renderLogin();
    const loginPage = container.querySelector('.login-page');
    
    // Verify the login page renders with the expected structure
    expect(loginPage).toBeTruthy();
    expect(loginPage?.classList.contains('login-page')).toBe(true);
    
    // Verify key elements exist
    const heroTitle = container.querySelector('.login-hero__title');
    const formInput = container.querySelector('.form-input');
    const button = container.querySelector('.btn-primary');
    
    expect(heroTitle).toBeTruthy();
    expect(formInput).toBeTruthy();
    expect(button).toBeTruthy();
  });

  it('should document the bug: .login-page inherits 18px from :root (EXPECTED TO FAIL on unfixed code)', () => {
    // EXPECTED BEHAVIOR: .login-page should have its own font-size rule
    // ON UNFIXED CODE: .login-page does NOT have a font-size override
    
    // Check if there's any .login-page rule with font-size
    const loginPageHasFontSize = /\.login-page\s*\{[^}]*font-size:/s.test(indexCssContent);
    
    // This assertion will FAIL on unfixed code
    // When it fails, it documents the counterexample: .login-page has no font-size override
    expect(loginPageHasFontSize).toBe(true);
  });

  it('should verify the fix location: .login-page rule should be after :root (EXPECTED TO FAIL on unfixed code)', () => {
    // EXPECTED BEHAVIOR: .login-page rule should exist after :root declaration
    // ON UNFIXED CODE: This rule does NOT exist
    
    const rootIndex = indexCssContent.indexOf(':root');
    const loginPageIndex = indexCssContent.indexOf('.login-page {');
    
    // This assertion will FAIL on unfixed code because .login-page rule doesn't exist in index.css
    // (it only exists in Login.css, not in index.css where the fix should be)
    expect(rootIndex).toBeGreaterThan(-1); // :root should exist
    expect(loginPageIndex).toBeGreaterThan(rootIndex); // .login-page should come after :root
  });
});
