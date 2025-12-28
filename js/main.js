/**
 * AquaPrint 3D - Main JavaScript
 */

// Product Database
const products = {
    'shrimp_cave': {
        name: 'Hang Trú Ẩn Cho Tép',
        price: '80.000₫',
        image: 'assets/images/shrimp_cave_pink.jpg',
        images: [
            'assets/images/shrimp_cave_pink.jpg',
            'assets/images/shrimp_cave_black.jpg',
            'assets/images/shrimp_cave_red.jpg',
            'assets/images/shrimp_cave_maroon.jpg'
        ],
        description: 'Hang trú ẩn được thiết kế chuyên biệt cho các loài tép cảnh (Tép Sula, Tép màu, Tép Lạnh). Thiết kế dạng hộp với các thanh dọc giúp tối ưu hóa diện tích bề mặt cho vi sinh phát triển, đồng thời cung cấp nơi trú ẩn an toàn cho tép con và tép mới lột vỏ. Sản phẩm chìm ngay trong nước, không cần ngâm xử lý. \n\nKích thước: 10cm x 5cm x 5cm \nChất liệu: Nhựa PETG an toàn. \nMàu sắc đa dạng: Hồng, Đen, Đỏ, Đỏ Đậm.'
    },
    'pleco_cave': {
        name: 'Hang Sinh Sản Pleco',
        price: '50.000₫',
        image: 'assets/images/pleco_cave.png',
        description: 'Hang gốm giả (Terracotta style) in 3D với độ hoàn thiện cao. Bề mặt trong nhẵn mịn bảo vệ da cá, thiết kế kín một đầu tạo cảm giác an toàn tuyệt đối cho các dòng cá Pleco (Cá lau kính), Ancistrus sinh sản. Độ bền vĩnh cửu, không phai màu theo thời gian.\n\nKích thước: 15cm x 5cm \nMàu sắc: Xám đậm.'
    },
    'moss_ledge': {
        name: 'Giá Đỡ Rêu / Cây Thủy Sinh',
        price: '120.000₫',
        image: 'assets/images/moss_ledge.png',
        description: 'Giải pháp tuyệt vời để tạo mảng xanh trên thành bể kính. Giá đỡ in 3D với thiết kế lưới giúp dễ dàng cột hoặc dán các loại rêu (Java, Christmas, Taiwan...) hoặc Bucephalandra. Đi kèm giác hút chất lượng cao, chịu lực tốt.\n\nBộ sản phẩm gồm: 1 Giá đỡ in 3D + 2 Giác hút + 1m dây cước tàng hình'
    },
    'filter_guard': {
        name: 'Đầu Bảo Vệ Hút Lọc',
        price: '30.000₫',
        image: 'assets/images/filter_guard.png',
        description: 'Đừng để tép con của bạn bị hút vào máy lọc! Đầu bảo vệ in 3D với mắt lưới siêu nhỏ đảm bảo dòng chảy thông thoáng nhưng ngăn chặn hiệu quả tôm, tép và cá con. Tương thích với các loại ống In-Out phổ biến (12mm, 16mm).\n\nDễ dàng tháo lắp và vệ sinh.'
    }
};

document.addEventListener('DOMContentLoaded', () => {
    
    /* =========================================
       Mobile Navigation Toggle
       ========================================= */
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle && navLinks) {
        const icon = menuToggle.querySelector('i');

        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            
            // Toggle icon between bars and times (x)
            if (navLinks.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });

        // Close mobile menu when clicking a link
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                if (navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });
    }

    /* =========================================
       Smooth Scrolling for Anchor Links (Index Page)
       ========================================= */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            // Only prevent default if we are on index page or linking to an ID on the same page
            const href = this.getAttribute('href');
            if (href.startsWith('#') && document.querySelector(href)) {
                 e.preventDefault();
                const targetElement = document.querySelector(href);
                if (targetElement) {
                    const headerOffset = 80;
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            } else if (href.includes('index.html#')) {
                // Allow default navigation for cross-page anchors
            }
        });
    });

    /* =========================================
       Contact Form Validation & Simulation
       ========================================= */
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Basic Validation
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const message = document.getElementById('message').value.trim();

            if (!name || !email || !message) {
                alert('Vui lòng điền đầy đủ thông tin.');
                return;
            }

            // Simulate form submission
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            
            submitBtn.textContent = 'Đang gửi...';
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.7';

            setTimeout(() => {
                alert(`Cảm ơn, ${name}! Chúng tôi đã nhận được tin nhắn của bạn và sẽ phản hồi sớm qua email ${email}.`);
                contactForm.reset();
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            }, 1500);
        });
    }

    /* =========================================
       Scroll Animations (Fade In)
       ========================================= */
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Add fade-in class to sections and cards for animation
    const animatedElements = document.querySelectorAll('.product-card, .feature-item, .section-header, .gallery-item');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });

    // Custom CSS for the animation effect
    const style = document.createElement('style');
    style.innerHTML = `
        .visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);


    /* =========================================
       Product Detail Page Logic
       ========================================= */
    if (window.location.pathname.endsWith('product.html') || window.location.search.includes('id=')) {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        if (productId && products[productId]) {
            const product = products[productId];
            
            // Update Title
            document.title = `${product.name} - AquaPrint 3D`;
            
            // Update Elements
            const imgEl = document.getElementById('detail-image');
            const nameEl = document.getElementById('detail-name');
            const priceEl = document.getElementById('detail-price');
            const descEl = document.getElementById('detail-description');

            if(imgEl) {
                imgEl.src = product.image;
                imgEl.alt = product.name;
            }
            if(nameEl) nameEl.textContent = product.name;
            if(priceEl) priceEl.textContent = product.price;
            if(descEl) descEl.innerText = product.description;

            // Render Gallery Indicators if multiple images exist
            const imageContainer = document.querySelector('.product-detail-image');
            // Remove existing thumbnails if any to prevent duplicates on re-run
            const existingThumbs = document.querySelector('.product-gallery-thumbnails');
            if (existingThumbs) existingThumbs.remove();

            if (product.images && product.images.length > 1) {
                const thumbsContainer = document.createElement('div');
                thumbsContainer.className = 'product-gallery-thumbnails';
                
                product.images.forEach((imgSrc, index) => {
                    const thumb = document.createElement('div');
                    thumb.className = `thumbnail ${index === 0 ? 'active' : ''}`;
                    thumb.innerHTML = `<img src="${imgSrc}" alt="${product.name} View ${index + 1}">`;
                    
                    thumb.addEventListener('click', () => {
                        // Update Main Image
                        imgEl.src = imgSrc;
                        // Update Active Class
                        document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                        thumb.classList.add('active');
                    });
                    
                    thumbsContainer.appendChild(thumb);
                });
                
                imageContainer.appendChild(thumbsContainer);
            }

        } else {
            // Product not found logic
            const detailInfo = document.querySelector('.product-detail-info');
            if (detailInfo) {
                detailInfo.innerHTML = `
                    <h2>Không tìm thấy sản phẩm</h2>
                    <p>Sản phẩm bạn tìm kiếm không tồn tại hoặc đã bị xóa.</p>
                    <a href="index.html" class="btn btn-primary" style="margin-top: 20px;">Quay lại Trang Chủ</a>
                `;
            }
            const detailImage = document.querySelector('.product-detail-image');
            if (detailImage) detailImage.style.display = 'none';
        }
    }
});
