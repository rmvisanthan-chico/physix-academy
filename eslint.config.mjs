/* PhysiX Academy — ESLint flat config.
 * Targets the vanilla ES-module browser app. Vendor libraries, the
 * third-party html5-sims, the Electron wrapper and generated output are
 * excluded — they are not ours to lint. */
// eslint-plugin-html/globals was referenced but unused — removed

export default [
  {
    /* 4A scope: first-party JS only. */
    files: ['js/**/*.js', 'tools/**/*.mjs', 'tests/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        /* Browser globals used across the app. */
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        indexedDB: 'readonly',
        performance: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        MutationObserver: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        history: 'readonly',
        speechSynthesis: 'readonly',
        Image: 'readonly',
        CustomEvent: 'readonly',
        Event: 'readonly',
        ErrorEvent: 'readonly',
        Promise: 'readonly',
        JSON: 'readonly',
        Math: 'readonly',
        Date: 'readonly',
        RegExp: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        ArrayBuffer: 'readonly',
        Uint8Array: 'readonly',
        Float64Array: 'readonly',
        structuredClone: 'readonly',
        devicePixelRatio: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLElement: 'readonly',
        AbortController: 'readonly',
        FileReader: 'readonly',
        crypto: 'readonly',
        /* Additional browser globals used by the codebase. */
        THREE: 'readonly',
        IntersectionObserver: 'readonly',
        getComputedStyle: 'readonly',
        SpeechSynthesisUtterance: 'readonly',
        Blob: 'readonly',
        confirm: 'readonly',
        NodeFilter: 'readonly',
        ResizeObserver: 'readonly',
        innerHeight: 'readonly',
        scrollY: 'readonly',
        innerWidth: 'readonly',
        matchMedia: 'readonly',
        PointerEvent: 'readonly',
        MouseEvent: 'readonly',
        MediaRecorder: 'readonly',
        btoa: 'readonly',
        Element: 'readonly',
        Storage: 'readonly',
        KeyboardEvent: 'readonly',
        TextDecoder: 'readonly',
        renderMathInElement: 'readonly',
        /* Project-specific globals (defined in utils, data-*, etc.) */
        Toast: 'readonly',
        getAllMetadata: 'readonly',
        getQuestionMeta: 'readonly',
        DIFFICULTY_CALIBRATION: 'readonly',
        getAssessmentHistory: 'readonly',
        getSessionReport: 'readonly',
        ASSESSMENT_SKILLS: 'readonly',
        viewAbout: 'readonly',
        PHYSIX_CONSENT: 'readonly',
        /* Node globals for tools and tests. */
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        Buffer: 'readonly'
      }
    },
    rules: {
      /* Keep the baseline honest: warnings only, no style churn. */
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': 'off'
    }
  },
  {
    /* Vendor and third-party code: not ours. */
    ignores: [
      'js/vendor/**',
      'node_modules/**',
      'dist/**',
      'electron/**',
      'astra/**',
      'html5-sims/**',
      'tools/.shots/**',
      'graphify-out/**'
    ]
  }
];
