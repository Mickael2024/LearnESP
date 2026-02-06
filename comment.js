// Variables globales
let comments = [];
let currentUserEmail = null;
let currentSort = 'newest';
let commentToDelete = null;
let commentToDeleteEmail = null;

// DOM Elements
let commentForm, commentsList, loadingComments, sortButtons, messageContainer;
let confirmationModal, emailVerificationModal, verificationEmailInput, verificationError;

// Initialiser les éléments DOM après le chargement de la page
function initDOMReferences() {
  commentForm = document.getElementById('comment-form');
  commentsList = document.getElementById('comments-list');
  loadingComments = document.getElementById('loading-comments');
  sortButtons = document.querySelectorAll('.sort-btn');
  messageContainer = document.getElementById('message-container');
  confirmationModal = document.getElementById('confirmation-modal');
  emailVerificationModal = document.getElementById('email-verification-modal');
  verificationEmailInput = document.getElementById('verification-email');
  verificationError = document.getElementById('verification-error');
}

// Fonctions globales pour les modals
window.closeConfirmationModal = function() {
  confirmationModal.style.display = 'none';
};

window.closeEmailVerificationModal = function() {
  emailVerificationModal.style.display = 'none';
  verificationEmailInput.value = '';
  verificationError.style.display = 'none';
};

window.verifyEmail = function() {
  const enteredEmail = verificationEmailInput.value.trim().toLowerCase();
  const storedEmail = commentToDeleteEmail ? commentToDeleteEmail.toLowerCase() : '';
  
  if (!enteredEmail) {
    verificationError.textContent = 'Veuillez entrer votre email.';
    verificationError.style.display = 'block';
    return;
  }
  
  if (!storedEmail) {
    verificationError.textContent = 'Erreur : email de référence manquant.';
    verificationError.style.display = 'block';
    return;
  }
  
  if (enteredEmail === storedEmail) {
    closeEmailVerificationModal();
    openConfirmationModal();
  } else {
    verificationError.textContent = 'L\'email ne correspond pas à celui utilisé pour ce commentaire.';
    verificationError.style.display = 'block';
  }
};

window.confirmDelete = async function() {
  if (!commentToDelete) {
    showMessage('error', 'Erreur : aucun commentaire à supprimer.');
    closeConfirmationModal();
    return;
  }
  
  const commentIdToDelete = commentToDelete;
  
  try {
    // Importer dynamiquement Firestore
    const { getFirestore, doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");
    const db = getFirestore();
    const commentRef = doc(db, 'comments', commentIdToDelete);
    await deleteDoc(commentRef);
    
    showMessage('success', 'Commentaire supprimé avec succès !');
    
    commentToDelete = null;
    commentToDeleteEmail = null;
    closeConfirmationModal();
    
    loadComments();
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    
    if (error.code === 'permission-denied') {
      showMessage('error', 'Permission refusée. Vérifiez les règles de sécurité Firestore.');
    } else {
      showMessage('error', 'Erreur lors de la suppression du commentaire.');
    }
    
    commentToDelete = null;
    commentToDeleteEmail = null;
    closeConfirmationModal();
  }
};

window.cancelVerification = function() {
  commentToDelete = null;
  commentToDeleteEmail = null;
  closeEmailVerificationModal();
};

window.cancelConfirmation = function() {
  commentToDelete = null;
  commentToDeleteEmail = null;
  closeConfirmationModal();
};

// Fonctions d'ouverture des modals
function openEmailVerificationModal(commentId, email) {
  if (!commentId || !email) {
    showMessage('error', 'Données manquantes pour la suppression.');
    return;
  }
  
  commentToDelete = commentId;
  commentToDeleteEmail = email;
  verificationEmailInput.value = '';
  verificationError.style.display = 'none';
  emailVerificationModal.style.display = 'flex';
}

function openConfirmationModal() {
  if (!commentToDelete) {
    showMessage('error', 'Erreur : commentaire non trouvé.');
    return;
  }
  
  confirmationModal.style.display = 'flex';
}

// Afficher un message
function showMessage(type, text) {
  const message = document.createElement('div');
  message.className = `message message-${type}`;
  message.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    ${text}
  `;
  
  messageContainer.innerHTML = '';
  messageContainer.appendChild(message);
  
  setTimeout(() => {
    if (message.parentNode === messageContainer) {
      message.remove();
    }
  }, 5000);
}

// Formater la date
function formatDate(timestamp) {
  if (!timestamp) return 'Date inconnue';
  
  try {
    let date;
    
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp._seconds) {
      date = new Date(timestamp._seconds * 1000);
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return 'Date inconnue';
    }
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Erreur de formatage de date:', error);
    return 'Date inconnue';
  }
}

// Obtenir les initiales pour l'avatar
function getInitials(name) {
  if (!name || typeof name !== 'string') return '??';
  return name.split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

// Vérifier si c'est un admin
function isAdmin(email) {
  if (!email) return false;
  const adminEmails = ['admin@arduinolearn.com', 'nagevajeanmickael@gmail.com'];
  return adminEmails.includes(email.toLowerCase());
}

// Trier les commentaires
function sortComments() {
  switch(currentSort) {
    case 'newest':
      comments.sort((a, b) => {
        const timeA = a.timestamp?._seconds || a.timestamp?.seconds || 0;
        const timeB = b.timestamp?._seconds || b.timestamp?.seconds || 0;
        return timeB - timeA;
      });
      break;
    case 'oldest':
      comments.sort((a, b) => {
        const timeA = a.timestamp?._seconds || a.timestamp?.seconds || 0;
        const timeB = b.timestamp?._seconds || b.timestamp?.seconds || 0;
        return timeA - timeB;
      });
      break;
    case 'replies':
      comments.sort((a, b) => (b.replies?.length || 0) - (a.replies?.length || 0));
      break;
  }
}

// Afficher les commentaires
function displayComments() {
  sortComments();
  
  if (comments.length === 0) {
    commentsList.innerHTML = `
      <div class="no-comments">
        <i class="fas fa-comments"></i>
        <h3>Aucun commentaire pour le moment</h3>
        <p>Soyez le premier à partager vos idées ou poser une question !</p>
      </div>
    `;
    return;
  }

  let html = '';
  
  comments.forEach(comment => {
    const isUserAdmin = isAdmin(comment.email);
    const initials = getInitials(comment.name);
    const dateStr = formatDate(comment.timestamp);
    const replyCount = comment.replies ? comment.replies.length : 0;
    const canDelete = comment.email && currentUserEmail && comment.email.toLowerCase() === currentUserEmail.toLowerCase();
    
    html += `
      <div class="comment-card" data-id="${comment.id}">
        <div class="comment-header">
          <div class="comment-user">
            <div class="user-avatar">${initials}</div>
            <div class="user-info">
              <h4>${comment.name || 'Anonyme'} ${isUserAdmin ? '<span class="admin-badge">ADMIN</span>' : ''}</h4>
              <div class="comment-date">
                <i class="far fa-clock"></i> ${dateStr}
              </div>
            </div>
          </div>
        </div>
        
        <div class="comment-content">${comment.content ? comment.content.replace(/\n/g, '<br>') : 'Contenu non disponible'}</div>
        
        <div class="comment-actions">
          <button class="btn btn-primary reply-btn" data-id="${comment.id}">
            <i class="fas fa-reply"></i> Répondre (${replyCount})
          </button>
          ${canDelete ? `
            <button class="btn btn-danger delete-comment-btn" data-id="${comment.id}" data-email="${comment.email}">
              <i class="fas fa-trash"></i> Supprimer
            </button>
          ` : ''}
        </div>
        
        ${comment.replies && comment.replies.length > 0 ? `
          <div class="reply-section">
            <h5 style="color: var(--gray-color); margin-bottom: 1rem;">
              <i class="fas fa-reply"></i> Réponses (${replyCount})
            </h5>
            ${comment.replies.map(reply => {
              const replyIsAdmin = isAdmin(reply.email);
              const replyDateStr = formatDate(reply.timestamp);
              return `
                <div class="reply-card">
                  <div class="reply-header">
                    <div class="reply-user">
                      <i class="fas fa-reply"></i> ${reply.name || 'Anonyme'} 
                      ${replyIsAdmin ? '<span class="admin-badge">ADMIN</span>' : ''}
                    </div>
                    <div class="comment-date">${replyDateStr}</div>
                  </div>
                  <div class="comment-content">${reply.content ? reply.content.replace(/\n/g, '<br>') : ''}</div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
        
        <div class="reply-form" id="reply-form-${comment.id}" style="display: none;">
          <form class="reply-form-inner" data-id="${comment.id}">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">
                  <i class="fas fa-user"></i> Votre nom *
                </label>
                <input type="text" class="form-input reply-name" 
                       placeholder="Votre nom" required>
              </div>
              <div class="form-group">
                <label class="form-label">
                  <i class="fas fa-envelope"></i> Email *
                </label>
                <input type="email" class="form-input reply-email" 
                       placeholder="votre@email.com" required>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">
                <i class="fas fa-comment-dots"></i> Votre réponse *
              </label>
              <textarea class="form-textarea reply-content" 
                        placeholder="Écrivez votre réponse ici..." 
                        rows="2" required></textarea>
            </div>
            <div style="display: flex; gap: 1rem;">
              <button type="submit" class="btn btn-success">
                <i class="fas fa-paper-plane"></i> Publier la réponse
              </button>
              <button type="button" class="btn btn-warning cancel-reply-btn">
                <i class="fas fa-times"></i> Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  });
  
  commentsList.innerHTML = html;
  updateStats();
  attachEventListeners();
}

// Mettre à jour les statistiques
function updateStats() {
  const totalComments = comments.length;
  const totalReplies = comments.reduce((sum, comment) => sum + (comment.replies?.length || 0), 0);
  
  const users = new Set();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let todayCount = 0;
  
  comments.forEach(comment => {
    if (comment.email) users.add(comment.email.toLowerCase());
    comment.replies?.forEach(reply => {
      if (reply.email) users.add(reply.email.toLowerCase());
    });
    
    try {
      let commentDate;
      if (comment.timestamp?.toDate) {
        commentDate = comment.timestamp.toDate();
      } else if (comment.timestamp?._seconds) {
        commentDate = new Date(comment.timestamp._seconds * 1000);
      } else if (comment.timestamp?.seconds) {
        commentDate = new Date(comment.timestamp.seconds * 1000);
      }
      
      if (commentDate && commentDate >= today) todayCount++;
    } catch (error) {
      console.error('Erreur de date:', error);
    }
    
    comment.replies?.forEach(reply => {
      try {
        let replyDate;
        if (reply.timestamp?.toDate) {
          replyDate = reply.timestamp.toDate();
        } else if (reply.timestamp?._seconds) {
          replyDate = new Date(reply.timestamp._seconds * 1000);
        } else if (reply.timestamp?.seconds) {
          replyDate = new Date(reply.timestamp.seconds * 1000);
        }
        
        if (replyDate && replyDate >= today) todayCount++;
      } catch (error) {
        console.error('Erreur de date de réponse:', error);
      }
    });
  });
  
  document.getElementById('total-comments').textContent = totalComments;
  document.getElementById('total-replies').textContent = totalReplies;
  document.getElementById('total-users').textContent = users.size;
  document.getElementById('today-comments').textContent = todayCount;
  document.getElementById('comments-count').textContent = totalComments;
}

// Charger les commentaires
async function loadComments() {
  try {
    loadingComments.style.display = 'block';
    
    // Importer dynamiquement Firestore
    const { getFirestore, collection, getDocs, query } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");
    const db = getFirestore();
    
    const q = query(collection(db, 'comments'));
    const querySnapshot = await getDocs(q);
    
    comments = [];
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      
      comments.push({
        id: docSnapshot.id,
        name: data.name || 'Anonyme',
        email: data.email || '',
        content: data.content || '',
        timestamp: data.timestamp || { _seconds: Date.now() / 1000 },
        replies: data.replies || []
      });
    });
    
    displayComments();
  } catch (error) {
    console.error('Erreur lors du chargement des commentaires:', error);
    showMessage('error', 'Impossible de charger les commentaires. Veuillez réessayer.');
    commentsList.innerHTML = '<div class="no-comments"><i class="fas fa-exclamation-circle"></i><h3>Erreur de chargement</h3><p>Impossible de charger les commentaires. Veuillez rafraîchir la page.</p></div>';
  } finally {
    loadingComments.style.display = 'none';
  }
}

// Envoyer un commentaire
async function submitComment(name, email, content) {
  try {
    // Importer dynamiquement Firestore
    const { getFirestore, collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");
    const db = getFirestore();
    
    const commentData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      content: content.trim(),
      timestamp: serverTimestamp(),
      replies: []
    };

    await addDoc(collection(db, 'comments'), commentData);
    
    currentUserEmail = email.trim().toLowerCase();
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'ajout du commentaire:', error);
    return false;
  }
}

// Attacher les événements
function attachEventListeners() {
  // Boutons de réponse
  document.querySelectorAll('.reply-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const commentId = btn.getAttribute('data-id');
      const replyForm = document.getElementById(`reply-form-${commentId}`);
      if (replyForm) {
        replyForm.style.display = replyForm.style.display === 'none' ? 'block' : 'none';
      }
    });
  });

  // Annuler réponse
  document.querySelectorAll('.cancel-reply-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const replyForm = btn.closest('.reply-form');
      if (replyForm) {
        replyForm.style.display = 'none';
      }
    });
  });

  // Soumettre réponse
  document.querySelectorAll('.reply-form-inner').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const commentId = form.getAttribute('data-id');
      const name = form.querySelector('.reply-name').value.trim();
      const email = form.querySelector('.reply-email').value.trim().toLowerCase();
      const content = form.querySelector('.reply-content').value.trim();

      try {
        // Importer dynamiquement Firestore
        const { getFirestore, doc, updateDoc, arrayUnion, Timestamp } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");
        const db = getFirestore();
        
        const commentRef = doc(db, 'comments', commentId);
        
        const reply = {
          name,
          email,
          content,
          timestamp: Timestamp.now()
        };

        await updateDoc(commentRef, {
          replies: arrayUnion(reply)
        });

        showMessage('success', 'Votre réponse a été publiée !');
        form.reset();
        const replyForm = form.closest('.reply-form');
        if (replyForm) {
          replyForm.style.display = 'none';
        }
        
        loadComments();
      } catch (error) {
        console.error('Erreur lors de l\'ajout de la réponse:', error);
        showMessage('error', 'Erreur lors de la publication de la réponse.');
      }
    });
  });

  // Supprimer commentaire
  document.querySelectorAll('.delete-comment-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const commentId = btn.getAttribute('data-id');
      const commentEmail = btn.getAttribute('data-email');
      
      if (commentId && commentEmail) {
        openEmailVerificationModal(commentId, commentEmail);
      } else {
        showMessage('error', 'Impossible de récupérer les informations de suppression.');
      }
    });
  });
}

// Gérer la soumission du formulaire principal
function setupFormSubmit() {
  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('comment-name').value.trim();
    const email = document.getElementById('comment-email').value.trim().toLowerCase();
    const content = document.getElementById('comment-content').value.trim();
    
    if (!name || !email || !content) {
      showMessage('error', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showMessage('error', 'Veuillez entrer une adresse email valide.');
      return;
    }
    
    const submitBtn = commentForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publication...';
    submitBtn.disabled = true;
    
    const success = await submitComment(name, email, content);
    
    if (success) {
      showMessage('success', 'Votre commentaire a été publié avec succès !');
      commentForm.reset();
      
      if (currentUserEmail) {
        document.getElementById('comment-email').value = currentUserEmail;
      }
      
      localStorage.setItem('arduinolearn_user_email', email);
      
      await loadComments();
      
      commentsList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      showMessage('error', 'Une erreur est survenue lors de la publication. Veuillez réessayer.');
    }
    
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  });
}

// Effacer le formulaire
function setupClearForm() {
  document.getElementById('clear-form').addEventListener('click', () => {
    commentForm.reset();
    if (currentUserEmail) {
      document.getElementById('comment-email').value = currentUserEmail;
    }
    showMessage('info', 'Formulaire effacé.');
  });
}

// Gérer le tri
function setupSorting() {
  sortButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const sortType = button.getAttribute('data-sort');
      
      sortButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      currentSort = sortType;
      displayComments();
    });
  });
}

// Écouter les nouveaux commentaires en temps réel
function setupRealtimeListener() {
  // Charger Firestore dynamiquement
  import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js")
    .then(({ getFirestore, collection, query, onSnapshot }) => {
      const db = getFirestore();
      const q = query(collection(db, 'comments'));
      
      onSnapshot(q, (snapshot) => {
        loadComments();
      }, (error) => {
        console.error("Erreur d'écoute en temps réel:", error);
      });
    })
    .catch(error => {
      console.error("Erreur lors du chargement de Firestore:", error);
    });
}

// Vérifier s'il y a un email dans le stockage local
function checkStoredUser() {
  const storedEmail = localStorage.getItem('arduinolearn_user_email');
  if (storedEmail) {
    document.getElementById('comment-email').value = storedEmail;
    currentUserEmail = storedEmail.toLowerCase();
  }
}

// Fermer les modals en cliquant à l'extérieur
function setupModalCloseListeners() {
  window.addEventListener('click', (e) => {
    if (e.target === confirmationModal) {
      cancelConfirmation();
    }
    if (e.target === emailVerificationModal) {
      cancelVerification();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (confirmationModal.style.display === 'flex') {
        cancelConfirmation();
      }
      if (emailVerificationModal.style.display === 'flex') {
        cancelVerification();
      }
    }
  });
}

// Initialiser l'application
async function initApp() {
  try {
    initDOMReferences();
    checkStoredUser();
    setupFormSubmit();
    setupClearForm();
    setupSorting();
    setupModalCloseListeners();
    
    await loadComments();
    setupRealtimeListener();
    
    setTimeout(() => {
      showMessage('info', 'Bienvenue dans la zone d\'échange ! Partagez vos idées et questions avec la communauté.');
    }, 1500);
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
    showMessage('error', 'Erreur de connexion à la base de données. Veuillez rafraîchir la page.');
  }
}

// Démarrer l'application
document.addEventListener('DOMContentLoaded', initApp);

// Gestionnaire d'erreurs global
window.addEventListener('error', (e) => {
  console.error('Erreur globale:', e.error);
});