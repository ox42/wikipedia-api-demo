/* please notice that I use let, const, fetch and other
features that are (relatively) new to the JavaScript language.
I've tried to do a mix of newer features (to show I know them), but which are
still supported in 90% of browsers. In a real-world scenario, we would use Babel
to generate backwards compatible code that runs in older browsers...
*/

(function () {
    let latestArticleDetails = undefined;

    function getWikiPage() {
        return document.getElementById('articleInput').value.replace(/\s+/g, '_');
    }

    function getLanguage() {
        const languageInput = document.getElementById('languageInput');
        const languageSelection = languageInput[languageInput.selectedIndex];

        const languageId = languageSelection.value;
        const languageDirection = (languageSelection.dataset && languageSelection.dataset.direction)
            ? languageSelection.dataset.direction : 'ltr';

        return {
            id: languageId,
            direction: languageDirection
        }
    }

    function getApiUrl() {
        const language = getLanguage();
        return `https://${language.id}.wikipedia.org/w/api.php?` + new URLSearchParams({
            origin: '*',
            format: 'json',
            action: 'parse',
            prop: 'sections|langlinks',
            page: getWikiPage()
        });
    }

    function presentTOC({parse}) {
        const language = getLanguage();
        const articlePageUrl = `https://${language.id}.wikipedia.org/wiki/${getWikiPage()}`;

        const tocContainer = document.querySelector('div.toc-container');
        tocContainer.classList.remove('direction-ltr', 'direction-rtl');
        tocContainer.classList.add('direction-' + language.direction);

        let listContentsHtml = '<ul class="toc-list">';
        let currentLevel = 1;

        parse.sections.forEach(section => {
            const level = parseInt(section.toclevel);
            while (currentLevel < level) {
                currentLevel++;
                listContentsHtml += '<ul>';
            }
            while (currentLevel > level) {
                currentLevel--;
                listContentsHtml += '</ul>';
            }

            listContentsHtml += `<li>
                                    <a href="${articlePageUrl}#${section.anchor}" target="_blank">
                                       <span class="number">${section.number}</span>
                                       ${section.line}
                                    </a>
                                 </li>`;
        });

        listContentsHtml += '</ul>';
        tocContainer.innerHTML = listContentsHtml;
    }

    function fetchTOC() {
        latestArticleDetails = undefined;
        document.querySelector('div.toc-container').innerHTML = ''; //loading indicator in a real project?

        fetch(getApiUrl(), {
            method: "GET",
            headers: {
                'Api-User-Agent': navigator.userAgent + ' bojankostadinov@gmail.com'
            }
        })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error('A network error occurred...')
                }
            })
            .then(data => {
                if (data.error || data.parse.sections.length === 0) {
                    throw new Error(data.error.info || 'An error occurred while fetching data...');
                }

                latestArticleDetails = {
                    article: document.getElementById('articleInput').value,
                    links: data.parse.langlinks
                };

                presentTOC(data);
            })
            .catch(error => {
                let errorMessage = error.message ? error.message : error;
                document.querySelector('div.toc-container').innerHTML = `<p class="alert alert-error">${errorMessage}</p>`;
            });
    }

    document.getElementById('fetchButton').onclick = (event) => {
        event.preventDefault();
        fetchTOC();
    };

    document.getElementById('languageInput').onchange = () => {
        const language = getLanguage();
        const articleInput = document.getElementById('articleInput');

        if (latestArticleDetails && latestArticleDetails.article === articleInput.value) {
            //article name still the same, but user asked to change language
            const articleInNewLanguage = latestArticleDetails.links.find(l => l.lang === language.id);

            if (articleInNewLanguage) {
                articleInput.value = articleInNewLanguage['*'];
                fetchTOC();
            }
        }
    };

    document.querySelector('.input-container form').onsubmit = (event) => {
        event.preventDefault();
        fetchTOC();
    };
})();
