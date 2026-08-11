(function () {
    const grid = document.querySelector('.courses-grid');
    if (!grid) return;
    const api = window.API_URL || window.location.origin;

    function card(course) {
        const item = document.createElement('article');
        item.className = 'course-item';
        const image = document.createElement('div');
        image.className = 'course-image';
        image.style.background = 'linear-gradient(135deg, #132238, #b18a45)';
        const info = document.createElement('div');
        info.className = 'course-info';
        const level = document.createElement('span');
        level.className = 'course-level';
        level.textContent = course.level || 'Beginner';
        const title = document.createElement('h3');
        title.textContent = course.title;
        const description = document.createElement('p');
        description.textContent = course.description || '';
        const meta = document.createElement('div');
        meta.className = 'course-meta';
        meta.textContent = `${course.duration_hours || 0} hours · ${course.total_lessons || 0} lessons`;
        const button = document.createElement('button');
        button.className = 'btn-outline';
        button.textContent = 'View Course';
        button.addEventListener('click', () => {
            const token = localStorage.getItem('authToken');
            if (token) fetch(`${api}/api/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                body: JSON.stringify({ event: 'course_view', relatedEntity: 'course', relatedEntityId: course.id }),
                keepalive: true
            }).catch(() => {});
            window.location.href = `course.html?id=${encodeURIComponent(course.id)}`;
        });
        info.append(level, title, description, meta, button);
        item.append(image, info);
        return item;
    }

    fetch(`${api}/api/courses`)
        .then(response => response.ok ? response.json() : Promise.reject(new Error('Unable to load courses')))
        .then(data => {
            if (!Array.isArray(data.courses) || !data.courses.length) return;
            grid.replaceChildren(...data.courses.map(card));
        })
        .catch(error => console.warn(error.message));
}());
