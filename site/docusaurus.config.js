// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

// const lightCodeTheme = require('prism-react-renderer/themes/github');
// const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Pulsocat',
  tagline:
    'Equip your team with a top-notch UI tool and unleash the full power of Pulsar',
  favicon: 'img/favicon.ico',

  url: 'https://your-docusaurus-test-site.com',
  baseUrl: '/',
  trailingSlash: true,
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // editUrl: '',
        },
        blog: {
          showReadingTime: true,
          // editUrl: '',
        },
        theme: {
          customCss: [
            require.resolve('./src/css/fonts.css'),
            require.resolve('./src/css/custom.css'),
            require.resolve('./src/css/navbar.css'),
            require.resolve('./src/css/footer.css'),
            require.resolve('./src/css/navbarSidebar.css'),
            require.resolve('./src/css/navbarCustomLink.css'),
            require.resolve('./src/css/navbarSidebarCustomLink.css'),
          ],
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        disableSwitch: true,
      },
      navbar: {
        title: '',
        logo: {
          alt: 'Pulsocat Logo',
          src: 'img/img_logo.svg',
        },
        items: [
          /* Left------------------------------------------------------------ */
          { to: '/product', label: 'Product', position: 'left' },
          { to: '/pricing', label: 'Pricing', position: 'left' },
          { to: '/docs', label: 'Docs', position: 'left' },
          { to: '/community', label: 'Community', position: 'left' },
          { to: '/company', label: 'Company', position: 'left' },

          /* Right----------------------------------------------------------- */
          { type: 'search', position: 'right' },
          {
            to: '/login',
            label: 'Login',
            position: 'right',
            className: 'loginLink',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Product',
            items: [],
          },
          {
            title: 'Pricing',
            items: [],
          },
          {
            title: 'Docs',
            items: [],
          },
          {
            title: 'Community',
            items: [],
          },
          {
            title: 'Company',
            items: [
              {
                label: 'Teal Tools Inc. on GitHub',
                href: 'https://github.com/tealtools',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Teal Tools, Inc. Built with Docusaurus.`,
      },
      /* prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      }, */
      /* algolia: {
        appId: '',
        apiKey: '',
        indexName: '',
      }, */
    }),
};

module.exports = config;
